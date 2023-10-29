const admin = require("firebase-admin");

var serviceAccount = require("./adminbot-cred.json");

const {
  getFirestore,
  addDoc,
  doc,
  setDoc,
  set,
} = require("firebase-admin/firestore");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore();

async function getEspecialidades() {
  const querySnapshot = await db.collection("especialidades").get();
  const especialidades = querySnapshot.docs.map((doc) => ({
    id: doc.id,
    title: doc.id,
  }));
  return especialidades;
}

async function getProfesionales(especialidad) {
  const profesRef = db.collection("profesionales");
  const snapshot = await profesRef
    .where("especialidad", "array-contains", especialidad)
    .get();
  if (snapshot.empty) {
    console.log("No matching documents.");
    return [];
  }

  /*   snapshot.forEach((doc) => {
    console.log(doc.id, "=>", doc.data());
  }); */

  const especialidades = snapshot.docs.map((doc) => ({
    id: doc.id,
    title: doc.data().nombre,
  }));
  return especialidades;
}

async function getAgenda(id_disponibilidad) {
  console.log("function getAgenda,id_agenda:", id_disponibilidad);
  const transaccionRef = db
    .collection("disponibilidad")
    .doc(`${id_disponibilidad}`);
  const doc = await transaccionRef.get();
  const agendas = doc.data().agenda;

  const objetosNoReservados = agendas.filter(
    (objeto) => objeto.reservado === false
  );

  // Función para mezclar aleatoriamente un array (algoritmo Fisher-Yates).
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // Mezcla el array aleatoriamente.
  shuffleArray(objetosNoReservados);

  // Obtiene los primeros 5 elementos del array mezclado.
  const cincoObjetosAleatorios = objetosNoReservados.slice(0, 5);

  let array_reservas = [];

  cincoObjetosAleatorios.map((element) => {
    let rows = {
      id: element.id,
      title: `${element.inicio}`,
    };
    array_reservas.push(rows);
  });
  console.log("arrayreservas", array_reservas);
  return array_reservas;
}

async function getDisponibilidad(profesional, especialidad) {
  const dispoRef = db.collection("disponibilidad");
  const snapshot = await dispoRef.get();
  const disponibilidadArray = [];
  /* const alldatos = [];
  snapshot.forEach((doc) => {
    alldatos.push({ id: doc.id, ...doc.data() });
  }); */

  function compararFechas(a, b) {
    const fechaA = new Date(a.fecha);
    const fechaB = new Date(b.fecha);
    return fechaA - fechaB;
  }

  snapshot.forEach((doc) => {
    const disponibilidadData = doc.data();
    disponibilidadData.id = doc.id;

    const unDiaEnMilisegundos = 24 * 60 * 60 * 1000; // 1 día en milisegundos
    const fechaActual = new Date();
    const fechaFutura = new Date(fechaActual.getTime() + unDiaEnMilisegundos);
    let fecha = disponibilidadData.fecha;
    if (new Date(fecha) > fechaFutura) {
      if (
        disponibilidadData.profesional == profesional &&
        disponibilidadData.especialidad == especialidad
      ) {
        disponibilidadArray.push({ id: doc.id, ...doc.data() });

        /* let rows = { id: disponibilidadData.id, title: fecha };
        disponibilidadArray.push(rows); */
      }
    }
  });

  const nuevoArray = [];
  if (disponibilidadArray.length > 0) {
    disponibilidadArray.sort(compararFechas);
    // Limitar el array a un máximo de 5 objetos
    const maxObjects = 5;
    const disponibilidadLimitado = disponibilidadArray.slice(0, maxObjects);
    disponibilidadLimitado.map((element) => {
      let rows = {
        id: element.id,
        title: element.fecha,
      };
      nuevoArray.push(rows);
    });
  }
  return nuevoArray;
}

function esFechaFutura(fecha) {
  const unDiaEnMilisegundos = 24 * 60 * 60 * 1000; // 1 día en milisegundos
  const fechaActual = new Date();
  const fechaFutura = new Date(fechaActual.getTime() + unDiaEnMilisegundos);
  return fecha > fechaFutura;
}

async function verificaWhatssap(whatsapp) {
  const data = { obra_social: "prueba" };
  const q = query(collection(db, "transacciones"));
  const querySnapshot = await getDocs(q);

  for (const doc of querySnapshot.docs) {
    const especialidad = doc.id;
    console.log("transaccion:", especialidad, "--whatssap", whatsapp);
    if (whatsapp === especialidad) {
      console.log("por tirar true");
      return true; // Retorna true si se encuentra una coincidencia
    }
  }
  const docRef = doc(db, "transacciones", whatsapp);
  await setDoc(docRef, data);
  return false;
}

module.exports = {
  getEspecialidades,
  db,
  getProfesionales,
  getDisponibilidad,
  getAgenda,
};
