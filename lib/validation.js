function normalizarEmail(valor) {
  return typeof valor === "string" ? valor.trim().toLowerCase() : "";
}

function textoValido(valor, { min = 1, max = 255 } = {}) {
  return (
    typeof valor === "string" &&
    valor.trim().length >= min &&
    valor.trim().length <= max
  );
}

function valorNumerico(valor, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  return (
    typeof valor === "number" &&
    Number.isFinite(valor) &&
    valor >= min &&
    valor <= max
  );
}

function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function dataValida(data) {
  if (typeof data !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return false;
  }

  const [ano, mes, dia] = data.split("-").map(Number);
  const dataUtc = new Date(Date.UTC(ano, mes - 1, dia));

  return (
    dataUtc.getUTCFullYear() === ano &&
    dataUtc.getUTCMonth() === mes - 1 &&
    dataUtc.getUTCDate() === dia
  );
}

module.exports = {
  normalizarEmail,
  textoValido,
  valorNumerico,
  emailValido,
  dataValida,
};
