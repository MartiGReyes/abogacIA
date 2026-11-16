package com.abogacia.microservicio_ciudadanos.correo;
/** Local abuse limit. Forwarded IP headers are deliberately not trusted. */
@org.springframework.stereotype.Component
public class LimiteCorreo extends org.springframework.web.filter.OncePerRequestFilter {
 private record Ventana(long minuto,int intentos){}
 private final java.util.concurrent.ConcurrentHashMap<String,Ventana> ventanas=new java.util.concurrent.ConcurrentHashMap<>();
 @Override protected void doFilterInternal(jakarta.servlet.http.HttpServletRequest request,jakarta.servlet.http.HttpServletResponse response,jakarta.servlet.FilterChain chain)throws java.io.IOException,jakarta.servlet.ServletException {
  String p=request.getRequestURI();
  boolean correo="POST".equals(request.getMethod())&&(p.equals("/api/ciudadanos")||p.equals("/api/ciudadanos/verificacion/cuenta")||p.equals("/api/ciudadanos/confirmar")||p.equals("/api/ciudadanos/correo/reenviar")||p.startsWith("/api/ciudadanos/recuperacion/"));
  if(!correo){chain.doFilter(request,response);return;}
  long minuto=System.currentTimeMillis();ventanas.entrySet().removeIf(e->e.getValue().minuto()+60000<=minuto);
  String key=request.getRemoteAddr()+":"+p;
  if(ventanas.size()>=10000&&!ventanas.containsKey(key)){response.setStatus(429);return;}
  int max=p.equals("/api/ciudadanos")?30:120;
  var v=ventanas.compute(key,(k,old)->old==null||old.minuto()+60000<=minuto?new Ventana(minuto,1):new Ventana(old.minuto(),Math.min(old.intentos()+1,max+1)));
  if(v.intentos()>max){response.setStatus(429);response.setHeader("Retry-After","60");response.setContentType("application/json");response.getWriter().write("{\"mensaje\":\"Demasiados intentos. Esper? un minuto y reintent?.\"}");return;}
  chain.doFilter(request,response);
 }
}
