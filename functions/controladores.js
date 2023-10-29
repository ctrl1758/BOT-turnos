module.exports = {
  quitarTercerDigito,
  esDNIValido,
};

function quitarTercerDigito(numero) {
  let numeroString = numero.toString();
  if (numeroString.length >= 3) {
    let nuevoNumeroString = numeroString.slice(0, 2) + numeroString.slice(3);
    return parseInt(nuevoNumeroString);
  } else {
    return numero;
  }
}

function esDNIValido(dni) {
  // Expresión regular para validar un DNI genérico (solo como ejemplo)
  // Debes adaptarla al formato específico del DNI en tu país
  const regex = /^[0-9]{8}$/; // Ejemplo: un DNI con 8 dígitos numéricos

  return regex.test(dni);
}
