package com.abogacia.microservicio_abogados.didit;

import com.abogacia.microservicio_abogados.repository.VerificacionIdentidadRepository;
import com.abogacia.microservicio_abogados.gestor.VerificacionIdentidadGestor;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import java.time.Instant;

@Configuration
@EnableScheduling
public class ReconciliarDidit {
    private static final org.slf4j.Logger log=org.slf4j.LoggerFactory.getLogger(ReconciliarDidit.class);
    private final VerificacionIdentidadRepository repository;
    private final VerificacionIdentidadGestor gestor;
    private final boolean enabled;
    @Value("${DIDIT_RECONCILIATION_INTERVAL_MS:60000}")
    private long intervalo=60000;
    @jakarta.annotation.PostConstruct
    void validarIntervalo(){
        if(intervalo<30000 || intervalo>3600000)throw new IllegalArgumentException("El intervalo de reconciliación debe estar entre 30000 y 3600000 ms.");
    }
    public ReconciliarDidit(VerificacionIdentidadRepository repository,VerificacionIdentidadGestor gestor,
            @Value("${DIDIT_RECONCILIATION_ENABLED:true}") boolean enabled){
        this.repository=repository;this.gestor=gestor;this.enabled=enabled;
    }
    @Scheduled(fixedDelayString="${DIDIT_RECONCILIATION_INTERVAL_MS:60000}",initialDelay=60000)
    public void reconciliar(){
        if(!enabled)return;
        for(var v:repository.findByProximaConsultaLessThanEqualOrderByProximaConsultaAsc(Instant.now(),PageRequest.of(0,10))){
            try{gestor.reconciliar(v.idAbogado,true);}
            catch(RuntimeException e){log.warn("No se pudo reconciliar una solicitud de identidad; se revisará en el próximo ciclo.");}
        }
    }
}
