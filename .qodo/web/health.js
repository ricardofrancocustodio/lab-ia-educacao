// rota /health para testes
const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.status(200).send("✅ API QNexy rodando!");
});

module.exports = router;
