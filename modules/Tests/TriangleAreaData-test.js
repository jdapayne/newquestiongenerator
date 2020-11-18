var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import TriangleAreaData from "../Question/GraphicQ/AreaPerimeter/TriangleAreaData.js";
const options = {
    questionType: 'area',
    maxLength: 100,
    noDistractors: false,
};
const types = [
    //  'area',
    //  'perimeter',
    'pythagorasArea',
    'pythagorasIsoscelesArea',
    'pythagorasPerimeter',
    'reverseArea',
    'reversePerimeter',
];
const button = document.getElementById("button");
button === null || button === void 0 ? void 0 : button.addEventListener("click", printNewTriangle);
let i = 0;
function printNewTriangle() {
    return __awaiter(this, void 0, void 0, function* () {
        options.questionType = types[i];
        console.log(`${i}. Type: ${types[i]}`);
        const triangleData = yield TriangleAreaData.random(options);
        console.log(triangleData);
        i = (i + 1) % 7;
    });
}
