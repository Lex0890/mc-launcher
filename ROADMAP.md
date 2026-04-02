# Roadmap - MCLauncher

## v1.1.0 - Mejoras de Estabilidad

- [ ] **Resume descargas** - Continuar descargas interrumpidas
- [ ] **Cache de versiones** - Guardar manifest locally y actualizar cada hora
- [ ] **Validación de integridad** - Verificar SHA1 de todos los archivos descargados
- [ ] **Manejo de errores mejorado** - Retry automático en descargas fallidas (3 intentos)
- [ ] **Logging estructurado** - Log a archivo con rotación

## v1.2.0 - Gestión de Instancias

- [ ] **Export/Import instancia** - Comprimir y compartir instancias
- [ ] **Backup automático** - Guardar estado antes de jugar
- [ ] **Clonar instancia** - Duplicar configuración
- [ ] **Directorio personalizado** - Elegir dónde guardar cada instancia
- [ ] **CurseForge integración** - Además de Modrinth

## v1.3.0 - Experiencia de Usuario

- [ ] **Theme system** - Modo claro/oscuroy temas adicionales
- [ ] **Notificaciones nativas** - Alerts del sistema
- [ ] **Atajos de teclado** - keybindings configurables
- [ ] **Animaciones configurables** - Reducir motion
- [ ] **Language support** - i18n para otros idiomas

## v1.4.0 - Funcionalidades de Juego

- [ ] **Shaders** - Instalación y gestión de shaders
- [ ] **Resource packs** - UI para resource packs
- [ ] **Skins/Capes** - Cambiar skin offline
- [ ] **Config editor** - Editar options.txt desde el launcher
- [ ] **Multiplayer** - Quick connect a servidores

## v2.0.0 - Enterprise

- [ ] **Sync en la nube** - Dropbox/Google Drive para perfiles
- [ ] **Plugin system** - API para extensiones
- [ ] **Auto-updater** - Actualizar el launcher automáticamente
- [ ] **Analytics** - Métricas anónimas de uso
- [ ] **Perfil profesional** - Modo online con cuenta Microsoft

---

## Issues Conocidos

- [ ] Descargas muy grandes pueden fallar sin feedback claro
- [ ] No hay forma de cancelar descarga en progreso
- [ ] El custom Java path no se usa correctamente
- [ ] Algunos mods de Forge no son compatibles con versiones recientes
- [ ] No hay soporte paraOptiFine

## Dependencias a Actualizar

- [ ] Electron 28 → 33+ (para usar Node.js 22)
- [ ] React 18 → 19
- [ ] Zustand 4 → 5
- [ ] Vite 5 → 6
