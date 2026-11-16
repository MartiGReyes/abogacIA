package com.abogacia.microservicio_abogados.foto;

import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import javax.imageio.*;
import javax.imageio.stream.MemoryCacheImageInputStream;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/** Stores only freshly encoded pixels; never retains original uploads or metadata. */
@Service
public class FotoPerfilStore {
    public static final int MAX_BYTES = 5 * 1024 * 1024;
    private final boolean enabled;
    private final Path root;
    public FotoPerfilStore(@Value("${abogacia.fotos.enabled:false}") boolean enabled,
                           @Value("${abogacia.fotos.directorio:}") String directory) {
        this.enabled = enabled;
        root = directory.isBlank() ? null : Path.of(directory).normalize();
        if (enabled && (root == null || !root.isAbsolute())) throw new IllegalArgumentException("Configurá un directorio absoluto persistente para las fotos.");
    }
    private Path file(long id) {
        if (!enabled) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Las fotos no están habilitadas en este entorno.");
        if (id <= 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        if (Files.isSymbolicLink(root)) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE);
        Path target = root.resolve(id + ".jpg");
        if (Files.isSymbolicLink(target)) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE);
        return target;
    }
    public synchronized byte[] leer(long id) {
        Path target = file(id);
        try {
            if (!Files.isRegularFile(target, LinkOption.NOFOLLOW_LINKS)) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
            return Files.readAllBytes(target);
        } catch (IOException e) { throw unavailable(); }
    }
    public synchronized void eliminar(long id) {
        try { Files.deleteIfExists(file(id)); } catch (IOException e) { throw unavailable(); }
    }
    public synchronized void guardar(long id, MultipartFile upload) {
        Path target = file(id);
        if (upload == null || upload.isEmpty()) throw invalid();
        if (upload.getSize() > MAX_BYTES) throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE,"La foto debe pesar hasta 5 MB.");
        byte[] bytes;
        try (var in = upload.getInputStream()) { bytes = in.readNBytes(MAX_BYTES + 1); }
        catch (IOException e) { throw invalid(); }
        if (bytes.length > MAX_BYTES) throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE,"La foto debe pesar hasta 5 MB.");
        byte[] jpeg = optimizar(bytes);
        Path temporary = null;
        try {
            Files.createDirectories(root);
            temporary = Files.createTempFile(root,"foto-", ".tmp");
            Files.write(temporary,jpeg);
            Files.move(temporary,target,StandardCopyOption.ATOMIC_MOVE,StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) { throw unavailable(); }
        finally { if (temporary != null) try { Files.deleteIfExists(temporary); } catch (IOException ignored) {} }
    }
    private static byte[] optimizar(byte[] bytes) {
        try (var input = new MemoryCacheImageInputStream(new ByteArrayInputStream(bytes))) {
            var readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) throw invalid();
            var reader = readers.next();
            try {
                String format = reader.getFormatName().toLowerCase(Locale.ROOT);
                if (!Set.of("jpeg","jpg","png","webp").contains(format)) throw invalid();
                reader.setInput(input,true,true);
                int width = reader.getWidth(0), height = reader.getHeight(0);
                if (width < 1 || height < 1 || width > 8192 || height > 8192 || (long)width*height > 16_000_000) throw invalid();
                var param = reader.getDefaultReadParam();
                int subsampling = Math.max(1, Math.max(width,height) / 1024);
                param.setSourceSubsampling(subsampling,subsampling,0,0);
                BufferedImage decoded = reader.read(0,param);
                if (decoded == null) throw invalid();
                double scale = Math.min(1.0,512.0/Math.max(decoded.getWidth(),decoded.getHeight()));
                var result = new BufferedImage(Math.max(1,(int)Math.round(decoded.getWidth()*scale)),Math.max(1,(int)Math.round(decoded.getHeight()*scale)),BufferedImage.TYPE_INT_RGB);
                var graphics = result.createGraphics();
                try { graphics.setColor(Color.WHITE);graphics.fillRect(0,0,result.getWidth(),result.getHeight());graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION,RenderingHints.VALUE_INTERPOLATION_BICUBIC);graphics.drawImage(decoded,0,0,result.getWidth(),result.getHeight(),null); }
                finally { graphics.dispose(); decoded.flush(); }
                var output = new ByteArrayOutputStream();
                var writer = ImageIO.getImageWritersByFormatName("jpeg").next();
                try (var stream = ImageIO.createImageOutputStream(output)) {
                    writer.setOutput(stream);var options=writer.getDefaultWriteParam();options.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);options.setCompressionQuality(.85f);
                    writer.write(null,new IIOImage(result,null,null),options);stream.flush();
                } finally { writer.dispose();result.flush(); }
                return output.toByteArray();
            } finally { reader.dispose(); }
        } catch (IOException | IllegalArgumentException e) { throw invalid(); }
    }
    private static ResponseStatusException invalid() { return new ResponseStatusException(HttpStatus.BAD_REQUEST,"Usá una imagen JPEG, PNG o WebP válida de hasta 16 megapíxeles."); }
    private static ResponseStatusException unavailable() { return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"No pudimos acceder a la foto. Intentá nuevamente."); }
}
