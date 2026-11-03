import java.io.Console;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.SecureRandom;
import java.util.*;
import org.springframework.security.crypto.bcrypt.BCrypt;

/** Local credential provisioning only. No Docker, network, database or environment inspection. */
public class PrepararAdmin {
    static String secret() {
        byte[] bytes = new byte[32]; new SecureRandom().nextBytes(bytes);
        return Base64.getEncoder().encodeToString(bytes);
    }
    static String hash(Console console, String label, String differentFrom) {
        char[] password = console.readPassword("%s (16–72 bytes, no se muestra): ", label);
        char[] confirmation = console.readPassword("Repetir: ");
        try {
            if (password == null || confirmation == null || !Arrays.equals(password, confirmation))
                throw new IllegalArgumentException("Las contraseñas no coinciden.");
            String value = new String(password);
            int length = value.getBytes(StandardCharsets.UTF_8).length;
            if (length < 16 || length > 72) throw new IllegalArgumentException("Usá entre 16 y 72 bytes UTF-8.");
            if (differentFrom != null && BCrypt.checkpw(value, differentFrom))
                throw new IllegalArgumentException("La contraseña de las cuentas ficticias debe ser diferente de ADMIN.");
            return BCrypt.hashpw(value, BCrypt.gensalt(12));
        } finally {
            if (password != null) Arrays.fill(password, '\0');
            if (confirmation != null) Arrays.fill(confirmation, '\0');
        }
    }
    public static void main(String[] args) throws Exception {
        if (args.length != 1) throw new IllegalArgumentException("Se requiere la ruta de docker/admin-readonly/.env.");
        Path target = Path.of(args[0]).toAbsolutePath().normalize();
        if (!target.endsWith(Path.of("docker", "admin-readonly", ".env")) || Files.exists(target))
            throw new IllegalArgumentException("Destino incorrecto o ya existente; no se sobrescribe.");
        Console console = System.console();
        if (console == null) throw new IllegalStateException("Ejecutar en una terminal interactiva para ocultar las contraseñas.");
        String adminHash = hash(console, "Nueva contraseña ADMIN EP06", null);
        String fixtureHash = hash(console, "Otra contraseña para ciudadano/abogado ficticios EP06", adminHash);
        var values = new LinkedHashMap<String, String>();
        values.put("EP06_OWNER_PASSWORD", secret());
        values.put("EP06_CIUDADANOS_DB_PASSWORD", secret());
        values.put("EP06_ABOGADOS_DB_PASSWORD", secret());
        values.put("EP06_INTERNAL_PASSWORD", secret());
        values.put("EP06_JWT_SECRET", secret());
        values.put("EP06_ADMIN_HASH", adminHash);
        values.put("EP06_FIXTURE_HASH", fixtureHash);
        StringBuilder text = new StringBuilder("# EP06 isolated test credentials. Do not commit or share.\n");
        values.forEach((key, value) -> text.append(key).append("='").append(value).append("'\n"));
        Files.writeString(target, text, StandardCharsets.UTF_8, StandardOpenOption.CREATE_NEW);
        console.printf("Preparado docker/admin-readonly/.env. No se ejecutó Docker, SQL ni ninguna conexión.\n");
    }
}
