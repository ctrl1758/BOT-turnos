# BOT-turnos

Un asistente virtual para la gestión de turnos médicos a través de WhatsApp.

## Descripción

Este proyecto es un endpoint que escucha y atiende solicitudes de turnos médicos basadas en la disponibilidad de la agenda de los profesionales. Utiliza la plataforma de Meta Developers (WhatsApp Business API) y está alojado en Google Cloud Functions.

El sistema guía a los pacientes a través de un flujo de conversación automatizado para agendar turnos médicos, recopilando información como:
- DNI del paciente
- Obra social
- Especialidad médica requerida
- Profesional preferido
- Fecha y horario disponible

## Características

- Integración con WhatsApp Business API para la comunicación con los pacientes
- Automatización del proceso de solicitud de turnos médicos
- Gestión de disponibilidad de profesionales en tiempo real
- Almacenamiento de datos en Firestore (Firebase)
- Validación de datos del paciente (DNI, etc.)
- Interfaz interactiva con botones y listas desplegables en WhatsApp

## Tecnologías utilizadas

- **Node.js**: Entorno de ejecución para JavaScript
- **Firebase Functions**: Plataforma serverless de Google Cloud
- **Firebase Firestore**: Base de datos NoSQL en tiempo real
- **WhatsApp Business API**: Para la comunicación con los pacientes
- **Express.js**: Framework para la creación del servidor HTTP
- **Axios**: Cliente HTTP para realizar solicitudes a la API de WhatsApp

## Arquitectura del proyecto

```
/functions
│
├── index.js          // Punto de entrada principal con los webhooks
├── firebase.js       // Conexión con Firestore y funciones de datos
├── controladores.js  // Funciones auxiliares de validación y procesamiento
├── package.json      // Dependencias del proyecto
└── adminbot-cred.json // Credenciales de Firebase (no incluido en el repo)
```

## Flujo de funcionamiento

1. El paciente inicia una conversación con el bot de WhatsApp
2. El sistema presenta opciones iniciales (TURNOS, CONSULTAS)
3. Si selecciona TURNOS, se solicita el DNI del paciente
4. Se pregunta por la obra social del paciente
5. Se muestra un listado de especialidades médicas disponibles
6. Se presenta un listado de profesionales para la especialidad seleccionada
7. Se muestran las fechas disponibles para el profesional seleccionado
8. Se presentan los horarios disponibles para la fecha seleccionada
9. Se confirma el turno y se almacena en la base de datos

## Dependencias

```json
{
  "dependencies": {
    "axios": "^1.4.0",
    "body-parser": "^1.20.2",
    "dotenv": "^16.3.1"
  }
}
```

## Variables de entorno

El proyecto requiere las siguientes variables de entorno configuradas en un archivo `.env`:

- `TOKEN`: Token de acceso a la API de WhatsApp Business
- `MYTOKEN`: Token de verificación del webhook

## Configuración

1. Clonar el repositorio
2. Crear un proyecto en Firebase y configurar Firestore
3. Obtener las credenciales de Firebase y guardarlas en `functions/adminbot-cred.json`
4. Configurar las variables de entorno
5. Desplegar en Firebase Functions

## Despliegue

Para desplegar el proyecto, se debe utilizar el CLI de Firebase:

```bash
firebase deploy --only functions
```

## Componentes adicionales

El proyecto menciona una segunda parte en desarrollo: un panel de control para el monitoreo de turnos y la habilitación de agendas, desarrollado en React y Firebase.

## Desarrollo

Para ejecutar el proyecto en entorno local:

1. Instalar las dependencias:
   ```bash
   npm install
   ```

2. Configurar las credenciales de Firebase y las variables de entorno

3. Ejecutar el emulador de Firebase Functions:
   ```bash
   firebase emulators:start --only functions
   ```

## Contribuciones

Este proyecto fue un desafío personal donde se trabajó desde cero con la plataforma de Meta Developers y Google Cloud Functions. Representa el primer proyecto del desarrollador con estas tecnologías.

