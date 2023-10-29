const functions = require("firebase-functions");

const {
  getEspecialidades,
  db,
  getProfesionales,
  getDisponibilidad,
  getAgenda,
} = require("./firebase");
const { quitarTercerDigito, esDNIValido } = require("./controladores");
const express = require("express");
const body_parser = require("body-parser");
const axios = require("axios").default;
require("dotenv").config();

const token = process.env.TOKEN;
const mytoken = process.env.MYTOKEN; //prasath_token

const app = express().use(body_parser.json()); // creates express http server:D

app.get("/webhook", (req, res) => {
  // Parse params from the webhook verification request
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  // Check if a token and mode were sent
  if (mode && token) {
    // Check the mode and token sent are correct
    if (mode === "subscribe" && token === mytoken) {
      // Respond with 200 OK and challenge token from the request
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  } else {
    return res.status(200).json({ mensaje: "hello kk" });
  }
});

app.post("/webhook", async (req, res) => {
  //i want some

  let body_param = req.body;

  if (body_param.object) {
    if (
      body_param.entry &&
      body_param.entry[0].changes &&
      body_param.entry[0].changes[0].value.messages &&
      body_param.entry[0].changes[0].value.messages[0]
    ) {
      let phon_no_id =
        body_param.entry[0].changes[0].value.metadata.phone_number_id;
      let from = body_param.entry[0].changes[0].value.messages[0].from;
      /* let msg_body = body_param.entry[0].changes[0].value.messages[0].text.body; */

      const url = `https://graph.facebook.com/v17.0/${phon_no_id}/messages`;
      let para = quitarTercerDigito(from);

      /* if (body_param.entry[0].changes[0].value.messages[0].type == "text") {*/
      const especialidades = await getEspecialidades();

      const WhatssapRef = db.collection("transacciones").doc(`${para}`);
      const doc = await WhatssapRef.get();
      if (!doc.exists) {
        console.log("No such document!");
        const resultado = await db
          .collection("transacciones")
          .doc(`${para}`)
          .set({ estado: "operacion" }, { merge: true });

        console.log("para:", para);
        let data = JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: para,
          type: "interactive",
          interactive: {
            type: "button",
            body: {
              text: "Hola, soy un asistente virtual, ¿en que puedo ayudarte hoy? SELECCIONE:",
            },
            action: {
              buttons: [
                {
                  type: "reply",
                  reply: {
                    id: "TURNOS",
                    title: "TURNOS",
                  },
                },
                {
                  type: "reply",
                  reply: {
                    id: "CONSULTAS",
                    title: "CONSULTAS",
                  },
                },
              ],
            },
          },
        });
        let config = {
          method: "post",
          maxBodyLength: Infinity,
          url: `https://graph.facebook.com/v17.0/${phon_no_id}/messages`,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          data: data,
        };
        axios
          .request(config)
          .then((response) => {
            return res.status(200).send("ok");
          })
          .catch((error) => {
            console.log("error", error);
            return res.status(400).send("nope");
          });
      } else {
        console.log("Document data:", doc.data());
        let transaccion = doc.data();
        let estado = transaccion.estado;

        switch (estado) {
          case "dni":
            let msg_body =
              body_param.entry[0].changes[0].value.messages[0].text.body;
            let esValido = esDNIValido(msg_body);
            if (esValido) {
              const resultado = await db
                .collection("transacciones")
                .doc(`${para}`)
                .set({ estado: "obra_social", dni: msg_body }, { merge: true });
              let data = JSON.stringify({
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: para,
                type: "interactive",
                interactive: {
                  type: "list",
                  body: {
                    text: "Selecciona obra social",
                  },
                  action: {
                    button: "Obra social",
                    sections: [
                      {
                        title: "selecciona:",
                        rows: [
                          {
                            id: "PAMI",
                            title: "PAMI",
                          },
                          {
                            id: "IOMA",
                            title: "IOMA",
                          },
                          {
                            id: "UOM",
                            title: "UOM",
                          },
                        ],
                      },
                    ],
                  },
                },
              });
              let config = {
                method: "post",
                maxBodyLength: Infinity,
                url: `https://graph.facebook.com/v17.0/${phon_no_id}/messages`,
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                data: data,
              };
              axios
                .request(config)
                .then((response) => {
                  return res.status(200).send("ok");
                })
                .catch((error) => {
                  console.log("error");
                  return res.status(400).send("nope");
                });
            } else {
              let data = JSON.stringify({
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: para,
                type: "text",
                text: {
                  // the text object
                  preview_url: true,
                  body: "ingrese su DNI sin puntos ni espacios",
                },
              });
              let config = {
                method: "post",
                maxBodyLength: Infinity,
                url: `https://graph.facebook.com/v17.0/${phon_no_id}/messages`,
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                data: data,
              };
              axios
                .request(config)
                .then((response) => {
                  return res.status(200).send("ok");
                })
                .catch((error) => {
                  console.log("error");
                  return res.status(400).send("nope");
                });
            }

            break;
          case "obra_social":
            let oSocial =
              body_param.entry[0]?.changes[0]?.value?.messages[0]?.interactive
                ?.list_reply?.title;
            if (oSocial !== undefined) {
              const resultado = await db
                .collection("transacciones")
                .doc(`${para}`)
                .set(
                  { estado: "especialidad", oSocial: oSocial },
                  { merge: true }
                );

              let data = JSON.stringify({
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: para,
                type: "interactive",
                interactive: {
                  type: "list",
                  body: {
                    text: "Selecciona la especialidad:",
                  },
                  action: {
                    button: "Especialidades",
                    sections: [
                      {
                        title: "Selecciona:",
                        rows: especialidades,
                      },
                    ],
                  },
                },
              });
              let config = {
                method: "post",
                maxBodyLength: Infinity,
                url: `https://graph.facebook.com/v17.0/${phon_no_id}/messages`,
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                data: data,
              };
              axios
                .request(config)
                .then((response) => {
                  return res.status(200).send("ok");
                })
                .catch((error) => {
                  console.log("error");
                  return res.status(400).send("nope");
                });
            } else {
              let data = JSON.stringify({
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: para,
                type: "interactive",
                interactive: {
                  type: "list",
                  body: {
                    text: "Selecciona obra social",
                  },
                  action: {
                    button: "Obra social",
                    sections: [
                      {
                        title: "selecciona:",
                        rows: [
                          {
                            id: "PAMI",
                            title: "PAMI",
                          },
                          {
                            id: "IOMA",
                            title: "IOMA",
                          },
                          {
                            id: "UOM",
                            title: "UOM",
                          },
                        ],
                      },
                    ],
                  },
                },
              });
              let config = {
                method: "post",
                maxBodyLength: Infinity,
                url: `https://graph.facebook.com/v17.0/${phon_no_id}/messages`,
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                data: data,
              };
              axios
                .request(config)
                .then((response) => {
                  return res.status(200).send("ok");
                })
                .catch((error) => {
                  console.log("error");
                  return res.status(400).send("nope");
                });
            }
            break;
          case "operacion":
            console.log("La opción es 3");
            let operacion =
              body_param.entry[0]?.changes[0]?.value?.messages[0]?.interactive
                ?.button_reply?.title;
            if (operacion !== undefined) {
              const resultado = await db
                .collection("transacciones")
                .doc(`${para}`)
                .set({ estado: "dni", operacion: operacion }, { merge: true });

              let data = JSON.stringify({
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: para,
                type: "text",
                text: {
                  preview_url: true,
                  body: "Por favor ingrese su DNI",
                },
              });
              let config = {
                method: "post",
                maxBodyLength: Infinity,
                url: `https://graph.facebook.com/v17.0/${phon_no_id}/messages`,
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                data: data,
              };
              axios
                .request(config)
                .then((response) => {
                  return res.status(200).send("ok");
                })
                .catch((error) => {
                  console.log("error");
                  return res.status(400).send("nope");
                });
            } else {
              let data = JSON.stringify({
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: para,
                type: "interactive",
                interactive: {
                  type: "button",
                  body: {
                    text: "Seleccione una de las opciones:",
                  },
                  action: {
                    buttons: [
                      {
                        type: "reply",
                        reply: {
                          id: "TURNOS",
                          title: "TURNOS",
                        },
                      },
                      {
                        type: "reply",
                        reply: {
                          id: "CONSULTAS",
                          title: "CONSULTAS",
                        },
                      },
                    ],
                  },
                },
              });
              let config = {
                method: "post",
                maxBodyLength: Infinity,
                url: `https://graph.facebook.com/v17.0/${phon_no_id}/messages`,
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                data: data,
              };
              axios
                .request(config)
                .then((response) => {
                  return res.status(200).send("ok");
                })
                .catch((error) => {
                  console.log("error");
                  return res.status(400).send("nope");
                });
            }
            break;
          case "especialidad":
            let especialidad =
              body_param.entry[0]?.changes[0]?.value?.messages[0]?.interactive
                ?.list_reply?.title;

            if (especialidad !== undefined) {
              const objetoEncontrado = especialidades.find(
                (objeto) => objeto.id === especialidad
              );

              if (objetoEncontrado) {
                let profesionales = await getProfesionales(especialidad);
                const resultado = await db
                  .collection("transacciones")
                  .doc(`${para}`)
                  .set(
                    { estado: "profesional", especialidad: especialidad },
                    { merge: true }
                  );
                let data = JSON.stringify({
                  messaging_product: "whatsapp",
                  recipient_type: "individual",
                  to: para,
                  type: "interactive",
                  interactive: {
                    type: "list",
                    body: {
                      text: "Selecciona un profesional:",
                    },
                    action: {
                      button: "Profesionales",
                      sections: [
                        {
                          title: "Selecciona:",
                          rows: profesionales,
                        },
                      ],
                    },
                  },
                });
                let config = {
                  method: "post",
                  maxBodyLength: Infinity,
                  url: `https://graph.facebook.com/v17.0/${phon_no_id}/messages`,
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  data: data,
                };
                axios
                  .request(config)
                  .then((response) => {
                    return res.status(200).send("ok");
                  })
                  .catch((error) => {
                    console.log("error");
                    return res.status(400).send("nope");
                  });
              } else {
                let data = JSON.stringify({
                  messaging_product: "whatsapp",
                  recipient_type: "individual",
                  to: para,
                  type: "interactive",
                  interactive: {
                    type: "list",
                    body: {
                      text: "Selecciona una especialidad:",
                    },
                    action: {
                      button: "Especialidades",
                      sections: [
                        {
                          title: "selecciona:",
                          rows: especialidades,
                        },
                      ],
                    },
                  },
                });
                let config = {
                  method: "post",
                  maxBodyLength: Infinity,
                  url: `https://graph.facebook.com/v17.0/${phon_no_id}/messages`,
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  data: data,
                };
                axios
                  .request(config)
                  .then((response) => {
                    return res.status(200).send("ok");
                  })
                  .catch((error) => {
                    console.log("error");
                    return res.status(400).send("nope");
                  });
              }
            } else {
              let data = JSON.stringify({
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: para,
                type: "interactive",
                interactive: {
                  type: "list",
                  body: {
                    text: "Selecciona una especialidad:",
                  },
                  action: {
                    button: "Especialidades",
                    sections: [
                      {
                        title: "selecciona:",
                        rows: especialidades,
                      },
                    ],
                  },
                },
              });
              let config = {
                method: "post",
                maxBodyLength: Infinity,
                url: `https://graph.facebook.com/v17.0/${phon_no_id}/messages`,
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                data: data,
              };
              axios
                .request(config)
                .then((response) => {
                  return res.status(200).send("ok");
                })
                .catch((error) => {
                  console.log("error");
                  return res.status(400).send("nope");
                });
            }
            break;
          case "profesional":
            let profesional =
              body_param.entry[0]?.changes[0]?.value?.messages[0]?.interactive
                ?.list_reply?.title;
            const transaccionRef = db
              .collection("transacciones")
              .doc(`${para}`);
            const transaccion = await transaccionRef.get();
            const id_especialidad = transaccion.data().especialidad;
            if (profesional !== undefined) {
              let profesionales = await getProfesionales(id_especialidad);
              console.log("profesionales", profesionales);
              const objetoEncontrado = profesionales.find(
                (objeto) => objeto.title === profesional
              );

              if (objetoEncontrado) {
                const resultado = await db
                  .collection("transacciones")
                  .doc(`${para}`)
                  .set(
                    { estado: "disponibilidad", profesional: profesional },
                    { merge: true }
                  );

                let disponibilidades = await getDisponibilidad(
                  profesional,
                  id_especialidad
                );
                if (disponibilidades.length == 0) {
                  let data = JSON.stringify({
                    messaging_product: "whatsapp",
                    recipient_type: "individual",
                    to: para,
                    type: "text",
                    text: {
                      preview_url: true,
                      body: `Disculpas no hay turnos disponibles con el profesional ${profesional} por el momento,vuelva a intentar mas tarde o llame al 0800-232-232 `,
                    },
                  });
                  let config = {
                    method: "post",
                    maxBodyLength: Infinity,
                    url: `https://graph.facebook.com/v17.0/${phon_no_id}/messages`,
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                    data: data,
                  };
                  axios
                    .request(config)
                    .then((response) => {
                      return res.status(200).send("ok");
                    })
                    .catch((error) => {
                      console.log("error");
                      return res.status(400).send("nope");
                    });
                } else {
                  let data = JSON.stringify({
                    messaging_product: "whatsapp",
                    recipient_type: "individual",
                    to: para,
                    type: "interactive",
                    interactive: {
                      type: "list",
                      body: {
                        text: "Selecciona uno de los turnos disponibles:",
                      },
                      action: {
                        button: "Turnos disponibles",
                        sections: [
                          {
                            title: "Selecciona:",
                            rows: disponibilidades,
                          },
                        ],
                      },
                    },
                  });
                  let config = {
                    method: "post",
                    maxBodyLength: Infinity,
                    url: `https://graph.facebook.com/v17.0/${phon_no_id}/messages`,
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                    data: data,
                  };
                  axios
                    .request(config)
                    .then((response) => {
                      return res.status(200).send("ok");
                    })
                    .catch((error) => {
                      console.log("error");
                      return res.status(400).send("nope");
                    });
                }
              } else {
                let profesionales = await getProfesionales(id_especialidad);
                let data = JSON.stringify({
                  messaging_product: "whatsapp",
                  recipient_type: "individual",
                  to: para,
                  type: "interactive",
                  interactive: {
                    type: "list",
                    body: {
                      text: "Selecciona un profesional:",
                    },
                    action: {
                      button: "Profesionales",
                      sections: [
                        {
                          title: "Selecciona:",
                          rows: profesionales,
                        },
                      ],
                    },
                  },
                });
                let config = {
                  method: "post",
                  maxBodyLength: Infinity,
                  url: `https://graph.facebook.com/v17.0/${phon_no_id}/messages`,
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  data: data,
                };
                axios
                  .request(config)
                  .then((response) => {
                    return res.status(200).send("ok");
                  })
                  .catch((error) => {
                    console.log("error");
                    return res.status(400).send("nope");
                  });
              }
            } else {
              let profesionales = await getProfesionales(id_especialidad);
              let data = JSON.stringify({
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: para,
                type: "interactive",
                interactive: {
                  type: "list",
                  body: {
                    text: "Selecciona un profesional:",
                  },
                  action: {
                    button: "Profesionales",
                    sections: [
                      {
                        title: "Selecciona:",
                        rows: profesionales,
                      },
                    ],
                  },
                },
              });
              let config = {
                method: "post",
                maxBodyLength: Infinity,
                url: `https://graph.facebook.com/v17.0/${phon_no_id}/messages`,
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                data: data,
              };
              axios
                .request(config)
                .then((response) => {
                  return res.status(200).send("ok");
                })
                .catch((error) => {
                  console.log("error");
                  return res.status(400).send("nope");
                });
            }
            break;
          case "disponibilidad":
            let disponibilidad_id =
              body_param.entry[0]?.changes[0]?.value?.messages[0]?.interactive
                ?.list_reply?.id;
            let disponibilidad_title =
              body_param.entry[0]?.changes[0]?.value?.messages[0]?.interactive
                ?.list_reply?.title;

            if (disponibilidad_id !== undefined) {
              const resultado = await db
                .collection("transacciones")
                .doc(`${para}`)
                .set(
                  { estado: "agenda", disponibilidad_id: disponibilidad_id },
                  { merge: true }
                );
              let sesiones = await getAgenda(disponibilidad_id);
              if (sesiones.length == 0) {
                let data = JSON.stringify({
                  messaging_product: "whatsapp",
                  recipient_type: "individual",
                  to: para,
                  type: "text",
                  text: {
                    preview_url: true,
                    body: `Disculpas no hay turnos disponibles para el ${disponibilidad_title} ,vuelva a intentar mas tarde o llame al 0800-232-232 `,
                  },
                });
                let config = {
                  method: "post",
                  maxBodyLength: Infinity,
                  url: `https://graph.facebook.com/v17.0/${phon_no_id}/messages`,
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  data: data,
                };
                axios
                  .request(config)
                  .then((response) => {
                    return res.status(200).send("ok");
                  })
                  .catch((error) => {
                    console.log("error");
                    return res.status(400).send("nope");
                  });
              } else {
                let data = JSON.stringify({
                  messaging_product: "whatsapp",
                  recipient_type: "individual",
                  to: para,
                  type: "interactive",
                  interactive: {
                    type: "list",
                    body: {
                      text: "Selecciona uno de los turnos disponibles:",
                    },
                    action: {
                      button: "Turnos disponibles",
                      sections: [
                        {
                          title: "Selecciona:",
                          rows: sesiones,
                        },
                      ],
                    },
                  },
                });
                let config = {
                  method: "post",
                  maxBodyLength: Infinity,
                  url: `https://graph.facebook.com/v17.0/${phon_no_id}/messages`,
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  data: data,
                };
                axios
                  .request(config)
                  .then((response) => {
                    return res.status(200).send("ok");
                  })
                  .catch((error) => {
                    console.log("error");
                    return res.status(400).send("nope");
                  });
              }
            } else {
              const transaccionRef = db
                .collection("transacciones")
                .doc(`${para}`);
              const doc = await transaccionRef.get();
              const especialidad = doc.data().especialidad;
              const profesional = doc.data().profesional;
              let disponibilidades = await getDisponibilidad(
                profesional,
                especialidad
              );
              if (disponibilidades.length == 0) {
                let data = JSON.stringify({
                  messaging_product: "whatsapp",
                  recipient_type: "individual",
                  to: para,
                  type: "text",
                  text: {
                    preview_url: true,
                    body: `Disculpas no hay turnos disponibles con el profesional ${profesional} por el momento,vuelva a intentar mas tarde o llame al 0800-232-232 `,
                  },
                });
                let config = {
                  method: "post",
                  maxBodyLength: Infinity,
                  url: `https://graph.facebook.com/v17.0/${phon_no_id}/messages`,
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  data: data,
                };
                axios
                  .request(config)
                  .then((response) => {
                    return res.status(200).send("ok");
                  })
                  .catch((error) => {
                    console.log("error");
                    return res.status(400).send("nope");
                  });
              } else {
                let data = JSON.stringify({
                  messaging_product: "whatsapp",
                  recipient_type: "individual",
                  to: para,
                  type: "interactive",
                  interactive: {
                    type: "list",
                    body: {
                      text: "Selecciona uno de los turnos disponibles en la lista:",
                    },
                    action: {
                      button: "Turnos disponibles",
                      sections: [
                        {
                          title: "Selecciona:",
                          rows: disponibilidades,
                        },
                      ],
                    },
                  },
                });
                let config = {
                  method: "post",
                  maxBodyLength: Infinity,
                  url: `https://graph.facebook.com/v17.0/${phon_no_id}/messages`,
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  data: data,
                };
                axios
                  .request(config)
                  .then((response) => {
                    return res.status(200).send("ok");
                  })
                  .catch((error) => {
                    console.log("error");
                    return res.status(400).send("nope");
                  });
              }
            }
            break;
          case "agenda":
            let agenda_id =
              body_param.entry[0]?.changes[0]?.value?.messages[0]?.interactive
                ?.list_reply?.id;
            let agenda_title =
              body_param.entry[0]?.changes[0]?.value?.messages[0]?.interactive
                ?.list_reply?.title;
            let entero = Number(agenda_id);
            console.log("agenda_id number:", entero - 1);
            const disponibilidadRef = db
              .collection("transacciones")
              .doc(`${para}`);
            const doc_transaccion = await disponibilidadRef.get();
            const id_disponibilidad = doc_transaccion.data().disponibilidad_id;
            const dni = doc_transaccion.data().dni;
            const osocial = doc_transaccion.data().oSocial;
            const profesional_ = doc_transaccion.data().profesional;
            const especialidad_ = doc_transaccion.data().especialidad;
            if (agenda_id !== undefined) {
              const agendaRef = db
                .collection("disponibilidad")
                .doc(`${id_disponibilidad}`);
              const doc_agenda = await agendaRef.get();
              const disponibilidad = doc_agenda.data();
              const fecha = disponibilidad.fecha;

              const agenda_array = disponibilidad.agenda;
              const hora = agenda_array[entero - 1].inicio;
              if (agenda_array[entero - 1].reservado) {
                console.log(
                  "el turno ya no esta disponible, vuelva a intentarlo"
                );
              } else {
                console.log(
                  "grabar datos del cliente y dejar en true el campo reserva "
                );

                agenda_array[entero - 1].reservado = true;
                agenda_array[entero - 1].paciente = {
                  dni: dni,
                  mail: "",
                  nombre: "",
                  oSocial: osocial,
                  telefono: para,
                };
                console.log("agenda_array update", agenda_array);

                // Set the 'capital' field of the city
                const res = await agendaRef.update({ agenda: agenda_array });

                await db
                  .collection("transacciones")
                  .doc(`${para}`)
                  .set(
                    { estado: "confirmacion", agenda_id: entero - 1 },
                    { merge: true }
                  );
                let data = JSON.stringify({
                  messaging_product: "whatsapp",
                  recipient_type: "individual",
                  to: para,
                  type: "text",
                  text: {
                    preview_url: true,
                    body: `Se asigno el siguiente turno:FECHA:${fecha}, HORARIO:${hora} PROFESIONAL:${profesional_}, ESPECIALIDAD:${especialidad_}`,
                  },
                });
                let config = {
                  method: "post",
                  maxBodyLength: Infinity,
                  url: `https://graph.facebook.com/v17.0/${phon_no_id}/messages`,
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  data: data,
                };
                axios
                  .request(config)
                  .then((response) => {
                    return res.status(200).send("ok");
                  })
                  .catch((error) => {
                    console.log("error");
                    return res.status(400).send("nope");
                  });
              }
            } else {
              let sesiones = await getAgenda(id_disponibilidad);
              if (sesiones.length == 0) {
                let data = JSON.stringify({
                  messaging_product: "whatsapp",
                  recipient_type: "individual",
                  to: para,
                  type: "text",
                  text: {
                    preview_url: true,
                    body: `Disculpas no hay turnos disponibles para el ${disponibilidad_title} ,vuelva a intentar mas tarde o llame al 0800-232-232 `,
                  },
                });
                let config = {
                  method: "post",
                  maxBodyLength: Infinity,
                  url: `https://graph.facebook.com/v17.0/${phon_no_id}/messages`,
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  data: data,
                };
                axios
                  .request(config)
                  .then((response) => {
                    return res.status(200).send("ok");
                  })
                  .catch((error) => {
                    console.log("error");
                    return res.status(400).send("nope");
                  });
              } else {
                let data = JSON.stringify({
                  messaging_product: "whatsapp",
                  recipient_type: "individual",
                  to: para,
                  type: "interactive",
                  interactive: {
                    type: "list",
                    body: {
                      text: "Selecciona uno de los turnos disponibles:",
                    },
                    action: {
                      button: "Turnos disponibles",
                      sections: [
                        {
                          title: "Selecciona:",
                          rows: sesiones,
                        },
                      ],
                    },
                  },
                });
                let config = {
                  method: "post",
                  maxBodyLength: Infinity,
                  url: `https://graph.facebook.com/v17.0/${phon_no_id}/messages`,
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  data: data,
                };
                axios
                  .request(config)
                  .then((response) => {
                    return res.status(200).send("ok");
                  })
                  .catch((error) => {
                    console.log("error");
                    return res.status(400).send("nope");
                  });
              }
            }
            break;
          default:
            console.log("Opción no reconocida");
            break;
        }
      }
      /* } else if (
        body_param.entry[0].changes[0].value.messages[0].type == "interactive"
      ) {
        if (
          body_param.entry[0].changes[0].value.messages[0].interactive.type ==
          "list_reply"
        ) {
          console.log("es un mensaje de tipo lista");
        } else if (
          body_param.entry[0].changes[0].value.messages[0].interactive.type ==
          "button"
        ) {
          console.log("es un mensaje de tipo button");
        }
      } */
    }
  }
});

app.get("/", (req, res) => {
  res.status(200).send("hello this is webhook setup");
});

app.get("/hello-word", (req, res) => {
  return res.status(200).json({ mensaje: "hello world" });
});

exports.app = functions.https.onRequest(app);

/* async function traerAgenda() {
  const transaccionRef = db.collection("transacciones").doc(`${para}`);
  const doc = await transaccionRef.get();
  const especialidad = doc.data().especialidad;
  let disponibilidades = await getDisponibilidad(profesional, especialidad);
}
 */
