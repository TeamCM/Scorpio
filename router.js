//Carrega as bibliotecas do Node.js
const router = require("express").Router();
const request = require("request");
const {MongoClient} = require("mongodb");
const path = require("path");

//Carrega todas as chaves secretas
const secretKeys = require("./secretKeys.json");

//Cria uma conexão com o servidor do scorpio de logins e servidores
const client = new MongoClient(secretKeys.mongodb.url, {useNewUrlParser: true,useUnifiedTopology: true});
client.connect(err => {if(err)return console.error(err.message)});

//Começa a pegar todas as informações
const db = client.db(secretKeys.mongodb.name);
const logins = db.collection(secretKeys.mongodb.userscollection);
const guilds = db.collection(secretKeys.mongodb.guildscollection);

//Variavel do nome do projeto
let name = "Scorpio";

//Renderiza todas as paginas passando o nome do projeto
router.get("/", (req, res) => {
  res.header({"Cache-Control": "no-cache, no-store, must-revalidate"});
  res.render("index", {title: name});
});

router.get("/purify.min.js", (req, res) => {
  res.header({"Content-Type": "application/javascript"});
  res.sendFile(path.join(__dirname, "purify.min.js"));
});

router.get("/", (req, res) => {
  res.header({"Content-Type": "application/javascript"});
  res.sendFile(path.join(__dirname, "purify.min.js.map"));
});

router.get("/app", (req, res) => {
  res.render("testlogin", {title: name, loginmode: 2});
});

router.get("/download", (req, res) => {
  res.render("download", {title: name});
});

router.get("/login", (req, res) => {
  //Aqui renderiza a mesma pagina pra o usuario não espera carrega a pagina de registro
  res.render("testlogin", {title: name, loginmode: 0});
});

router.get("/register", (req, res) => {
  //Mesma coisa aqui mas com a pagina de registro
  res.render("testlogin", {title: name, loginmode: 1});
});

router.get("/recaptchasitekey", (req, res) => {
  //Manda o codigo captcha para o site (não pro servidor)
  res.status(200).send(secretKeys.google.sitekey);
});

router.get("/.well-known/security.txt", (req, res) => {
  //Manda a security.txt
  res.render("security");
});

router.post("/api/v1/register", (req, res) => {
  //Api de registro
  
  //Verifica se tiver: nome, email e senha pra salvar no servidor
  if(!req.body.name) return res.status(400).json({message: "Please select name"});
  if(!req.body.email) return res.status(400).json({message: "Please select email"});
  if(!req.body.password) return res.status(400).json({message: "Please select password"});

  //Verifica se o usuario clicou no captcha
  if(!req.body.captcha) return res.status(400).json({message: "Please select captcha"});

  //Pega a key pro servidor (Não pro cliente)
  const secretKey = secretKeys.google.recaptcha;

  //Cria um link para enviar para a API
  const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${req.body.captcha}&remoteip=${req.connection.remoteAddress}`;

  //Cria as variaveis de id e descriminator
  let id = Date.now();
  let descriminator = Math.floor(Math.random() * (9999 - 1000 + 1) + 1000);

  //Manda um request verificando se tudo deu certo
  request(verifyUrl, (err, response, body) => {
    body = JSON.parse(body);

    if(!body.success) return res.status(400).json({message:"Duplicated captcha, or fatal error in server"});

    //Se tudo deu certo, crie o token do usuario
    let token = `${require("uuid").v4()}`;

    //Salva na database
    logins.insertOne({token: token, username: req.body.name, email: req.body.email, password: req.body.password, id: id, descriminator: descriminator, desactivated: false, banned: false, guilds: []});

    //E por final, retorna o token do usuario
    return res.status(200).json({message: "Account created", user: {
      token: token
    }});
  });
});
router.post("/api/v1/login", (req, res) => {
  //Tenta achar a conta, se ela estiver banida do scorpio ou desativada pelo usuario, retorne um erro
  logins.findOne({email: req.body.email}, function(err, item){
    if(err){
      console.log(err.stack);
      return res.status(500).json({message: "Server error"});
    }
    if(!item) {
      return res.status(404).json({message: "Cannot find that account"});
    }
    if(item.banned == true){
      return res.status(400).json({message: "That account is banned"});
    }

    if(item.desactivated == true){
      return res.status(400).json({message: "That account is desactivated by the user"});
    }

    res.status(200).json({message: "Account logged", user: {
      token: item.token
    }});
  });
});

router.post("/api/v1/user", (req, res) => {
  //Retorne as informações do usuario
  logins.findOne({token: req.headers.authorization}, function(err, item){
    if(err){
      console.log(err.stack);
      return res.status(500).json({message: "Server error"});
    }
    if(!item) return res.status(404).json({message: "Account not found"});

    res.status(200).json({message: "Send user info", user: item});
  });
});

router.get("/api/v1/download", (req, res) => {
  //Manda baixar o setup do scorpio
  res.download("Setup.exe");
});

router.post("/api/v1/banned", (req, res) => {
  //Ve se a conta existe e se não está banida
  logins.findOne({token: req.headers.authorization}, function(err, item){
    if(err){
      console.log(err.stack);
      return res.status(500).json({message: "Server error"});
    }
    if(!item) return res.status(404).json({message: "Not found"});
    if(item.banned == true){
      return res.status(200).json({banned: true});
    }
    else{
      return res.status(200).json({banned: false});
    }
  });
});

router.post("/api/v1/guild", (req, res) => {
  //Tudo sobre entrar, criar, deletar e sair de um servidor
  if(!req.headers.authorization || !req.body.type) return res.status(400).json({message: "Need user token & type"});

  if(req.body.type == "create"){
    if(!req.body.guildname) return res.status(400).json({message: "Need guildname"});
    let id = Date.now();
    logins.findOne({token: req.headers.authorization}, function(err, item){
      if(err){
        console.log(err.stack);
        return res.status(500).json({message: "Server error"});
      }
      if(!item.token) return res.status(400).json({message: "Account not found"});
      guilds.insertOne({id: id, name: req.body.guildname, owner: {
        username: item.username,
        descriminator: item.descriminator,
        id: item.id
      }, invites: [

      ], members: {

      }});
      console.log(logins);
      return res.status(201).send();
    });
  }
  if(req.body.type == "delete"){
    if(!req.body.guildid) return res.status(400).json({message: "Need guildid"});
    logins.findOne({token: req.headers.authorization}, function(err, item){
      if(!item.token) return res.status(400).json({message: "Account not found"});
      guilds.deleteOne({id: req.body.guildid});
    });
  }
  if(req.body.type == "join"){
    logins.findOne({token: req.headers.authorization}, function(err, item){
      if(!item.token) return res.status(400).json({message: "Account not found"});
    });
  }
  if(req.body.type == "leave"){
    logins.findOne({token: req.headers.authorization}, function(err, item){
      if(!item.token) return res.status(400).json({message: "Account not found"});
    });
  }
});

//Se o usuario criar uma conexão, que crie
global.io.on("connection", socket => {
  socket.on("messageForServer", details => {
    logins.findOne({token: details.token}, function(err, item){
      if(err){
        console.log(err.stack);
        return res.status(500).json({message: "Server error"});
      }
      if(!item) return socket.emit("error", {message: "Invalid token", logout: true});
      if(item.banned == true) return socket.emit("error", {message: "Your account is banned", logout: true});
      if(item.desactivated == true) return socket.emit("error", {message: "Your account is desactivated by you", logout: true});

      if(details.token == secretKeys.owner.token && details.message == "!reiniciar") {socket.broadcast.emit("refresh");return socket.emit("refresh");}
      if(details.token == secretKeys.owner.token && details.message.includes("!mandar")) {let args = details.message.split(" ");socket.broadcast.emit("messageCreate",{message: args.slice(1).join(" "), author: "[Servidor]"});return socket.emit("messageCreate",{message: args.slice(1).join(" "), author: "[Servidor]"});}

      let newMsg = details.message.replace(/\</g, "&lt;").replace(/\//g, "&#47;").replace(/\>/g, "&gt;");

      let thisDate = new Date();
      let details1 = {
        message: newMsg,
        author: item.username,
        timestampH: thisDate.getHours(),
        timestampM: thisDate.getMinutes()
      }

      if(!details1.message) return socket.emit("error", "Cannot send a empty message");

      socket.emit("messageCreate", details1);
      socket.broadcast.emit("messageCreate", details1);
    });
  });
});

router.post("/api/sendfile", (req, res) => {
  if(!req.headers.authorization) return res.status(401).json({message: "no token specified"});
  logins.findOne({token: req.headers.authorization}, function(err, item){
    if(err){
      console.log(err.stack);
      return res.status(500).json({message: "Server error"});
    }
    if(!item) return res.status(401).json({message: "Invalid token"});
    let thisDate = new Date();
    global.io.emit("messageCreate", {message: "<img src=\"\" alt=\"\">", author: item.username, timestampH: thisDate.getHours(), timestampM: thisDate.getMinutes()});
    res.status(200).send("Done");
  });
});

router.all("/api/*", (req, res) => {
  //Retorne o error 404 se não achar um request da api
  res.status(404).json({message: "404: Not found"});
});
router.all("*", (req, res) => {
  //Retorne a página de erro se não achar a pagina especificada
  res.status(404).render("404", {title: name});
});

//Por final, retorne isso pro servidor
module.exports = router;
