function verificarAdmin(req, res, next) {
  if (!req.session.usuarioId) {
    return res.status(401).json({
      sucesso: false,
      mensagem: "Usuário não está logado.",
    });
  }

  if (req.session.tipo !== "admin") {
    return res.status(403).json({
      sucesso: false,
      mensagem: "Acesso não autorizado.",
    });
  }

  next();
}

module.exports = verificarAdmin;
