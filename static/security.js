console.log("%cNÃO COLE NADA AQUI, SENÃO VOCÊ PODE SER HACKEADO", "font-size: 30px;");
console.log("%cScorpio não irá responsabiliza por sua conta ser hackeada, apenas se for roubada por Brute force", "font-size: 20px;");
window.eval = function(){
    throw new Error("Para a segurança do usuario, nos desativamos o eval");
}
window.Function = function(){
    throw new Error("Para a segurança do usuario, nos desativamos a Function");
}