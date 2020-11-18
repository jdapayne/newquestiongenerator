var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
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
function pretendFetch(n) {
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
    return new Promise(function (resolve, reject) {
        setTimeout(function () { return resolve(response); }, 3000);
    });
}
function delay(ms) {
    return new Promise(function (resolve, reject) {
        setTimeout(function () { return resolve(); }, ms);
    });
}
function pretendFetch2(n) {
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
    return delay(3000).then(function () { return response; });
}
function delayedResolve(val, ms) {
    return new Promise(function (resolve, reject) {
        setTimeout(function () { resolve(val); }, ms);
    });
}
var Message = /** @class */ (function () {
    function Message(name, message) {
        this.name = name;
        this.message = message;
    }
    Message.prototype.print = function () {
        console.log(this.name + " says \"" + this.message + "\"");
    };
    return Message;
}());
var DelayedMessage = /** @class */ (function (_super) {
    __extends(DelayedMessage, _super);
    function DelayedMessage() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    DelayedMessage.prototype.print = function () {
        return __awaiter(this, void 0, void 0, function () {
            var message;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log(this.name + " says...");
                        return [4 /*yield*/, delayedResolve(this.message, 2000)];
                    case 1:
                        message = _a.sent();
                        console.log(message);
                        return [2 /*return*/];
                }
            });
        });
    };
    return DelayedMessage;
}(Message));
var joe = new Message("Joe", "Hello world");
var slowJoe = new DelayedMessage("Slow Joe", "H e l l o w o r l d");
joe.print();
slowJoe.print();
