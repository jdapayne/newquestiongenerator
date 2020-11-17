function pretendGet(n, callback) {
    var response;
    if (n === 0) {
        response = "foo";
    }
    else if (n === 1) {
        response = "bar";
    }
    else {
        response = "Hello world";
    }
    setTimeout(function () { callback(response); }, 3000);
    console.log("Loading...");
}
console.log("Main script before pretend get");
var a = pretendGet(1, function (s) {
    console.log(s.toUpperCase());
});
console.log("Main script after pretend get");
