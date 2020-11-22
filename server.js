//Carrega as bibliotecas pro servidor
const http = require("http");
const express = require("express");
const app = express();

//Cria um servidor http passando o app do express
const server = http.createServer(app);
const io = require("socket.io")(server);

global.io = io;

//Registra a configuração do servidor
app.set("views", "./views");
app.set("view engine", "ejs");
app.use(express.static("public"));

//Manda o servidor usar o res.json() para a nossa API
app.use(express.urlencoded({extended: false}));
app.use(express.json());

//Manda o servidor usar nossas rotas HTTP
app.use(require("./router.js"));

//Por final faça o servidor carregar na porta 80 (Padrão do HTTP) e ainda manda no terminal "servidor ta on"
server.listen(80, () => {
  console.log("servidor ta on");
});
