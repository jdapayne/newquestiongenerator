import { randBetween, randElem } from "utilities";
export default class RectangleAreaData {
    constructor(base, height, showOpposites, areaProperties, perimeterProperties) {
        this.base = base;
        this.height = height;
        this.showOpposites = showOpposites;
        this._area = areaProperties;
        this._perimeter = perimeterProperties;
    }
    static random(options) {
        options.maxLength = options.maxLength || 20; // default values
        options.dp = options.dp || 0;
        const sides = {
            base: randBetween(1, options.maxLength),
            height: randBetween(1, options.maxLength)
        };
        const base = { val: sides.base, show: true, missing: false };
        const height = { val: sides.height, show: true, missing: false };
        let showOpposites;
        let areaProperties = {};
        let perimeterProperties = {};
        //selectively hide/missing depending on type
        switch (options.questionType) {
            case "area":
                areaProperties.show = true;
                areaProperties.missing = true;
                showOpposites = !options.noDistractors;
                break;
            case "perimeter":
                perimeterProperties.show = true;
                perimeterProperties.missing = true;
                showOpposites = options.noDistractors;
                break;
            case "reverseArea":
                areaProperties.show = true;
                areaProperties.missing = false;
                randElem([base, height]).missing = true;
                showOpposites = false;
                break;
            case "reversePerimeter":
            default:
                perimeterProperties.show = true;
                perimeterProperties.missing = false;
                randElem([base, height]).missing = true;
                showOpposites = false;
                break;
        }
        return new this(base, height, showOpposites, areaProperties, perimeterProperties);
    }
    get perimeter() {
        if (!this._perimeter) {
            this._perimeter = {
                show: false,
                missing: true
            };
        }
        if (!this._perimeter.val) {
            this._perimeter.val = 2 * (this.base.val + this.height.val);
        }
        return this._perimeter;
    }
    get area() {
        if (!this._area) {
            this._area = {
                show: false,
                missing: true
            };
        }
        if (!this._area.val) {
            this._area.val = this.base.val * this.height.val;
        }
        return this._area;
    }
}
