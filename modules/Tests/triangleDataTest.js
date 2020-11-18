var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as TriangleData from '../triangleData.js';
/*
for (let i=0; i<300; i++) {
  TriangleData.getTriangle(100,(t) => {
    //console.log(`Under 20: ${i}: b:${t.b}, s1:${t.s1}, s2:${t.s2}`)
  })
}
*/
const button = document.getElementById("button");
button === null || button === void 0 ? void 0 : button.addEventListener("click", printNewTriangle);
function printNewTriangle() {
    return __awaiter(this, void 0, void 0, function* () {
        const elem = document.createElement('div');
        document.body.append(elem);
        const loader = document.createElement('div');
        loader.classList.add("loader");
        elem.append(loader);
        const triangle = yield TriangleData.getTriangle(500);
        const area = triangle.b * triangle.h / 2;
        const perimeter = triangle.s1 + triangle.s2 + triangle.b;
        elem.innerHTML = `Sides: ${triangle === null || triangle === void 0 ? void 0 : triangle.s1}, ${triangle === null || triangle === void 0 ? void 0 : triangle.s2}, ${triangle === null || triangle === void 0 ? void 0 : triangle.b}, height: ${triangle === null || triangle === void 0 ? void 0 : triangle.h}. Area = ${area}. Perimeter = ${perimeter}`;
    });
}
/* Using the callback verstion
button?.addEventListener("click", () => {
  TriangleData.getTriangle(500, t => {
    document.body.insertAdjacentHTML("beforeend",`<p>Sides: ${t?.s1}, ${t?.s2}, ${t?.b}, height: ${t?.h}</p>`)
  })
})
*/ 
