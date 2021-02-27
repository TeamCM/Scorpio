//Carrega o router pro server.js, request (pro captcha), mongodb, path e chalk
const Router = require("express").Router();
const request = require("request");
const {MongoClient} = require("mongodb");
const path = require("path");

const chalk = require("chalk");

global.sockets = {};

//Carrega todas as chaves secretas
const secretKeys = require("../secretKeys.js");

//Cria uma conexão com o servidor do scorpio de logins e servidores

console.log(chalk.blue("[DATABASE] Conectando a database..."));
const client = new MongoClient(secretKeys.mongodb.url, {useNewUrlParser: true,useUnifiedTopology: true});
client.connect(err => {if(err){return console.error(err.message);}console.log(chalk.green("[DATABASE] Database iniciada!"));});

//Começa a pegar todas as informações
console.log(chalk.blue("[DATABASE] Conectando as coleções..."));
const db = client.db(secretKeys.mongodb.name);
const logins = db.collection(secretKeys.mongodb.userscollection);
const guilds = db.collection(secretKeys.mongodb.guildscollection);
const messages = db.collection(secretKeys.mongodb.messagescollection);

console.log(chalk.green("[DATABASE] Conexão criada!..."));

//Variavel do nome do projeto
let name = "Scorpio";

class assignRouter{
  get(where, functionTodo){
      try{
        Router.get(where, functionTodo);
        console.log(`${global.ok} Registrado ${where} como GET`);
      }
      catch{
        console.log(`${global.error} erro ao registrar ${where}`);
        process.exit(1);
      }
  }
  post(where, functionTodo){
      try{
        Router.post(where, functionTodo);
        console.log(`${global.ok} Registrado ${where} como POST`);
      }
      catch{
        console.log(`${global.error} erro ao registrar ${where}`);
        process.exit(1);
      }
  }
  del(where, functionTodo){
      try{
        Router.delete(where, functionTodo);
        console.log(`${global.ok} Registrado ${where} como DELETE`);
      }
      catch{
        console.log(`${global.error} erro ao registrar ${where}`);
        process.exit(1);
      }
  }
  options(where, functionTodo){
    try{
      Router.options(where, functionTodo);
      console.log(`${global.ok} Registrado ${where} como OPTIONS`);
    }
    catch{
      console.log(`${global.error} erro ao registrar ${where}`);
      process.exit(1);
    }
  }
  all(where, functionTodo){
    try {
      Router.all(where, functionTodo);
      console.log(`${global.ok} Registrado ${where} pra tudo`);
    } catch (err) {
      console.log(`${global.error} erro ao registrar ${where}`);
      process.exit(1);
    }
  }
}
let router = new assignRouter;

//Renderiza todas as paginas passando o nome do projeto
router.get("/", (req, res) => {
  res.render("index", {title: name});
});

router.get("/app", (req, res) => {
  res.render("app", {title: name, loginmode: 2});
});

router.get("/rules", (req, res) => {
  res.render("rules", {title: name});
});

router.get("/guidelines", (req, res) => {
  res.render("guidelines", {title: name});
});

router.get("/download", (req, res) => {
  res.render("download", {title: name});
});

router.get("/login", (req, res) => {
  //Aqui renderiza a mesma pagina pra o usuario não espera carrega a pagina de registro
  res.render("app", {title: name, loginmode: 0});
});

router.get("/register", (req, res) => {
  //Mesma coisa aqui mas com a pagina de registro
  res.render("app", {title: name, loginmode: 1});
});

router.get("/recaptchasitekey", (req, res) => {
  //Manda o codigo captcha para o site (não pro servidor)
  res.send(secretKeys.google.sitekey);
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

  if(typeof req.body.name != "string") return res.status(400).json({message: "Name needs to be an string"});
  if(typeof req.body.email != "string") return res.status(400).json({message: "Email needs to be an string"});
  if(typeof req.body.password != "string") return res.status(400).json({message: "Password needs to be an string"});

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
    logins.insertOne({token: token, username: req.body.name, email: req.body.email, password: req.body.password, id: id, descriminator: descriminator, desactivated: false, banned: false, guilds: [], admin: false});

    //E por final, retorna o token do usuario
    return res.status(201).json({message: "Account created", user: {
      token: token
    }});
  });
});
router.post("/api/v1/login", (req, res) => {
  //Tenta achar a conta, se ela estiver banida do scorpio ou desativada pelo usuario, retorne um erro
  if(typeof req.body.email != "string") return res.status(400).json({message: "Email needs to be an string"});
  if(typeof req.body.password != "string") return res.status(400).json({message: "Password needs to be an string"});
  logins.findOne({email: req.body.email, password: req.body.password}, function(err, item){
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
router.post("/api/v2/deleteAcc", (req, res) => {
  if(!req.headers.authorization) return res.status(400).json({message: "Need token"});
  if(typeof req.headers.authorization != "string") return res.status(400).json({message: "Token needs to be an string"});

  if(!req.body.password) return res.status(400).json({message: "Need password"});
  if(typeof req.body.password != "string") return res.status(400).json({message: "Password needs to be an string"});
  logins.findOne({token: req.headers.authorization}, function(err, item){
    if(err){
      console.log(err.stack);
      return res.status(500).json({message: "Server error"});
    }
    if(!item) return res.status(404).json({message: "Account not found"});

    if(item.password !== req.body.password) return res.status(400).json({message: "Password is not equal!"});
    logins.deleteOne({token: item.token});
    res.json({message: "Goodbye :<", logout: true});
  });
});

router.get("/api/v1/user", (req, res) => {
  //Retorne as informações do usuario
  if(!req.headers.authorization) return res.status(400).json({message: "Need token"});
  if(typeof req.headers.authorization != "string") return res.status(400).json({message: "Token needs to be an string"});
  logins.findOne({token: req.headers.authorization}, function(err, item){
    if(err){
      console.log(err.stack);
      return res.status(500).json({message: "Server error"});
    }
    if(!item) return res.status(404).json({message: "Account not found"});

    let things = item;
    delete things._id;
    delete things.token;
    delete things.desactivated;
    delete things.banned;
    delete things.password;
    
    delete things.guilds;
    delete things.friends;
    delete things.blocked;
    res.json({message: "User data!", user: things});
  });
});

router.get("/api/v2/guilds", (req, res) => {
  if(!req.headers.authorization) return res.status(400).json({message: "Need token"});
  if(typeof req.headers.authorization != "string") return res.status(400).json({message: "Token needs to be an string"});
  logins.findOne({token: req.headers.authorization}, function(err, item){
    if(err){
      console.log(err.stack);
      return res.status(500).json({message: "Server error"});
    }
    if(!item) return res.status(404).json({message: "Account not found"});

    res.json({message: "Guilds data!", guilds: item.guilds});
  });
});

router.post("/api/v2/channels", (req, res) => {
  if(!req.body.uuid) return res.status(400).json({message: "Need UUID"});
  if(typeof req.body.uuid != "string") return res.status(400).json({message: "UUID needs to be an string"});
  guilds.findOne({uuid: req.body.uuid}, function(err, item){
    if(err){
      console.log(err.stack);
      return res.status(500).json({message: "Server error"});
    }
    if(!item) return res.status(404).json({message: "Guild not found"});

    res.status(200).json({message: "Channels of the guild there", channels: item.channels});
  });
});
router.post("/api/v2/messages", (req,res) => {
  if(!req.body.uuid) return res.status(400).json({message: "Need UUID"});
  if(typeof req.body.uuid != "string") return res.status(400).json({message: "UUID needs to be an string"});
  messages.find({uuid: req.body.uuid}).toArray(function(err,item){
    if(err){
      console.log(err.stack);
      return res.status(500).json({message: "Server error"});
    }
    if(!item) return res.status(404).json({message: "Message not found"});

    const messages_array = item;
    messages_array.forEach(function(obj){
      delete obj._id;
    });
    res.status(200).json({message: "All messages", messages: messages_array});
  });
});

router.get("/api/v1/download", (req, res) => {
  //Manda baixar o setup do scorpio
  res.download("Setup.exe");
});

router.get("/api/v1/banned", (req, res) => {
  //Ve se a conta existe e se não está banida
  if(typeof req.headers.authorization != "string") return res.status(400).json({message: "Token needs to be an string"});
  logins.findOne({token: req.headers.authorization}, function(err, item){
    if(err){
      console.log(err.stack);
      return res.status(500).json({message: "Server error"});
    }
    if(!item) return res.status(404).json({message: "Not found"});
    if(item.banned == true){
      return res.json({banned: true});
    }
    else{
      return res.json({banned: false});
    }
  });
});

router.post("/api/v1/guild", (req, res) => {
  //Tudo sobre entrar, criar, deletar e sair de um servidor
  if(!req.headers.authorization || !req.body.type) return res.status(400).json({message: "Need user token & type"});
  if(typeof req.headers.authorization != "string") return res.status(400).json({message: "Token needs to be an string"});
  if(typeof req.body.type != "string") return res.status(400).json({message: "Type needs to be an string"});

  if(req.body.type == "create"){
    if(!req.body.guildname) return res.status(400).json({message: "Need guildname"});
    if(typeof req.body.guildname != "string") return res.status(400).json({message: "Invalid guildname"});
    logins.findOne({token: req.headers.authorization}, function(err, item){
      if(err){
        console.log(err.stack);
        return res.status(500).json({message: "Server error"});
      }
      if(!item.token) return res.status(400).json({message: "Account not found"});

      const uuid = require("uuid").v4();
      guilds.insertOne({uuid: uuid, name: req.body.guildname, owner: {
        username: item.username,
        descriminator: item.descriminator,
        id: item.id
      }, channels: [
        
      ],
      members: [
        {
          username: item.username,
          descriminator: item.descriminator,
          id: item.id
        }
      ]
      });

      const oldguilds = item.guilds;
      oldguilds.push({uuid: uuid, name: req.body.guildname});

      logins.updateOne({token: req.headers.authorization}, {$set: {guilds: oldguilds}}, function(err2){
        if(err2){
          console.log(err2.stack);
          return res.status(500).json({message: "Server error"});
        }
        res.status(201).json({uuid: uuid, name: req.body.guildname});
      });
      /*global.token.find(tobj=>{
        if(tobj.token==item.token){
          tobj.client.emit("guildCreated", {id: id, name: req.body.guildname});
        }
      });//*/
    });
  } else if(req.body.type == "delete"){
    if(!req.body.guilduuid) return res.status(400).json({message: "Need guilduuid"});
    if(typeof req.body.guilduuid != "string") return res.status(400).json({message: "Invalid guilduuid"});
    let guilduuid = String(req.body.guilduuid);
    logins.findOne({token: req.headers.authorization}, function(err, item){
      if(err){
        console.log(err.stack);
        return res.status(500).json({message: "Server error"});
      }
      if(!item) return res.status(404).json({message: "Account not found"});
      guilds.findOne({uuid: guilduuid}, function(err2, item2){
          if(err2){
            console.log(err2.stack);
            return res.status(500).json({message: "Server error"});
          }
          if(!item2) return res.status(404).json({message: "Guild not found"});
          if(item2.owner.id != item.id) return res.status(400).json({message: "Owner id not equal to user id"});
          guilds.deleteOne({id: guilduuid});

          const oldguilds = item.guilds;
          if (oldguilds[0]){
            for(let i=0;i<oldguilds.length;i++){
              if(oldguilds[i].uuid == guilduuid){
                delete oldguilds[i];
              }
            }
          }

          /*for(let i=0;i<item2.members.length;i++){
            let memberobj = item2.members[i];
            logins.findOne({id: memberobj.id}, function(err3,item3){
              if(err3){
                console.log(err3.stack);
                return res.status(500).json({message: "Server error"});
              }
              const member_oldguilds = item3.guilds;
              if (member_oldguilds[0]){
                for(let ii=0;i<member_oldguilds.length;ii++){
                  let uuid = member_oldguilds[ii];
                  console.log(uuid);
                  if(uuid == guilduuid){
                    delete member_oldguilds[ii];
                    break;
                  }
                }
              }
              logins.updateOne({id: memberobj.id}, {$set: {guilds: member_oldguilds}});
            });
          }*/

          logins.updateOne({token: req.headers.authorization}, {$set: {guilds: oldguilds}}, function(err3){
            if(err3){
              console.log(err3.stack);
              return res.status(500).json({message: "Server error"});
            }
            res.status(200).json({message: "Guild deleted"});
          });
      });
    });
  } else if(req.body.type == "join"){
    logins.findOne({token: req.headers.authorization}, function(err,item){
      if(err){
        console.log(err.stack);
        return res.status(500).json({message: "Server error"});
      }
      if(!item) return res.status(404).json({message: "Account not found"});
      if(!req.body.guilduuid) return res.status(400).json({message: "Need guilduuid"});
      if(typeof req.body.guilduuid != "string") return res.status(400).json({message: "guilduuid needs to be an string"});

      guilds.findOne({uuid: req.body.guilduuid}, function(err2,item2){
        if(err2){
          console.log(err2.stack);
          return res.status(500).json({message: "Server error"});
        }
        if(!item) return res.status(404).json({message: "Guild not found"});

        let pause = false;
        for(let i=0;i<item2.members.length;i++){
          console.log("a")
          console.log(item2.members[i].id);
          console.log(item.id);
          console.log(item2.members[i].id == item.id);
          if(item2.members[i].id == item.id){pause = true; break;}
        }
        if(pause == true) return res.status(400).json({message: "User already in that guild"});
        
        item2.members.push({username: item.username, descriminator: item.descriminator, id: item.id});
        guilds.updateOne({uuid: req.body.guilduuid}, {$set: {members: item.guilds}});

        item.guilds.push({uuid: item2.uuid, name: item2.name});
        logins.updateOne({token: req.headers.authorization}, {$set: {guilds: item.guilds}});

        res.status(200).json({message: "Joined guild!"});
      });
    });
  } else if(req.body.type == "leave"){
    logins.findOne({token: req.headers.authorization}, function(err,item){
      if(err){
        console.log(err.stack);
        return res.status(500).json({message: "Server error"});
      }
      if(!item) return res.status(404).json({message: "Account not found"});
      if(!req.body.guilduuid) return res.status(400).json({message: "Need guilduuid"});
      if(typeof req.body.guilduuid != "string") return res.status(400).json({message: "guilduuid needs to be an string"});

      guilds.findOne({uuid: req.body.guilduuid}, function(err2,item2){
        if(err){
          console.log(err2.stack);
          return res.status(500).json({message: "Server error"});
        }
        if(!item2) return res.status(404).json({message: "Guild not found"});
        for(let i=0;i<item.guilds;i++){
          if(item.guilds[i].uuid == guilduuid){
            delete item.guilds[i];
            break;
          }
        }
        logins.updateOne({token: req.headers.authorization}, {$set: {guilds: item.guilds}});


        for(let i=0;i<item2.members.length;i++){
          if(item2.members[i].id == item.id){
            delete item2.members.length[i];
            break;
          }
        }
        guilds.updateOne({uuid: item2.uuid}, {$set: {members: item2.members}});

        res.status(200).json({message: "Leaved!"});
      });
    });
  } else {
    return res.status(400).json({message: "Invalid type"});
  }
});

/*io.use((socket, next) => {
  let token = socket.handshake.headers['Authorization'];
  logins.findOne({token: token}, function(err,item){
    if(err) return next(new Error("Server error!"));
    if(!item) return next(new Error("Account not found"));

    return next();
  });
});//*/

//Se o usuario criar uma conexão, que crie
global.io.on("connection", socket => {
  socket.on("messageForServer", details => {
    if(!details) return socket.emit("error", {message: "No details field specified"})
    if(typeof details != "object") return socket.emit("error", {message: "Details needs to be an Object"});
    if(!details.token) return socket.emit("error", {message: "No token specified"});
    if(typeof details.token != "string") return socket.emit("error", {message: "Token needs to be an string"});
    logins.findOne({token: details.token}, function(err, item){
      if(err){
        console.log(err.stack);
        return socket.emit("error", {message: "Server error"});
      }
      if(!item) return socket.emit("error", {message: "Invalid token", logout: true});
      if(item.banned == true) return socket.emit("error", {message: "Your account is banned", logout: true});
      if(item.desactivated == true) return socket.emit("error", {message: "Your account is desactivated by you", logout: true});

      if(item.admin && details.message == "!reiniciar") {socket.broadcast.emit("refresh");return socket.emit("refresh");}
      if(item.admin && details.message.includes("!mandar")) {let args = details.message.split(" ");socket.broadcast.emit("messageCreate",{message: args.slice(1).join(" "), author: "<img src=android-icon-36x36.png> [Servidor] <i class=\"fas fa-check-double\"></i>"});return socket.emit("messageCreate",{message: args.slice(1).join(" "), author: "<img src=android-icon-36x36.png> [Servidor] <i class=\"fas fa-check-double\"></i>"});}

      if(!details.message){return socket.emit("error", {message: "Cannot send a empty message"})}
      let newMsg = details.message.replace(/\</g, "&lt;")/*.replace(/\//g, "&#47;")*/.replace(/\>/g, "&gt;").replace(/\n/, "<br />");

      let thisDate = new Date();
      let details1 = {
        message: newMsg,
        author: item.username,
        authorId: item.id,
        timestampH: thisDate.getHours(),
        timestampM: thisDate.getMinutes()
      }

      if(!details1.message) return socket.emit("error", "Cannot send a empty message");

      socket.emit("messageCreate", details1);
      socket.broadcast.emit("messageCreate", details1);
    });
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

process.on("SIGINT", () => {
  console.log(`${chalk.blue("[DATABASE] Fechando conexão com a database...")}`);
  client.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log(`${chalk.blue("[DATABASE] Fechando conexão com a database...")}`);
  client.close();
  process.exit(0);
});

//Por final, retorne isso pro servidor
module.exports = Router;
