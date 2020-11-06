import LinExpr from "LinExpr";
import { randBetween, randElem, randMultBetween, shuffle, weakIncludes } from "Utilities";
import { AlgebraOptions } from "./AlgebraOptions";
import { MissingAnglesData } from "./MissingAnglesData";
import { NumberOptions } from "./NumberOptions";

type Options = AlgebraOptions

export type ExpressionType = 'add' | 'multiply' | 'mixed'
export default class MissingAnglesAlgebraData implements MissingAnglesData {
    angles: number[]
    missing: boolean[]
    angleSum: number
    angleLabels: string[]
    x: number //
    
    constructor(angles: number[], missing: boolean[], angleSum: number, angleLabels: string[], x: number) {
        this.angles = angles
        this.angleSum = angleSum
        this.angleLabels = angleLabels
        this.x = x
        this.missing = missing
    }

    static random (options: Options) : MissingAnglesAlgebraData {
        const defaults : Options = {
            expressionTypes: ['add','multiply', 'mixed'],
            ensureX: true,
            includeConstants: true,
            minCoefficient: 1,
            maxCoefficient: 4,
            angleSum: 180,
            minAngle: 20,
            minN: 2,
            maxN: 4,
            minXValue: 15,
        }
        options = Object.assign({},defaults, options)

        //assign calculated defaults:
        options.maxConstant = options.maxConstant || options.angleSum/2
        options.maxXValue = options.maxXValue || options.angleSum/4

        // Randomise/set up main features
        let n : number = randBetween(options.minN, options.maxN)

        const type : ExpressionType = randElem(options.expressionTypes);

        // Generate expressions/angles
        let expressions : LinExpr[]
        switch(type) {
            case 'mixed':
                expressions = makeMixedExpressions(n,options)
                break
            case 'multiply': 
                expressions = makeMultiplicationExpressions(n,options)
                break
            case 'add': 
            default:
                expressions = makeAddExpressions(n,options)
                break
        }
        expressions = shuffle(expressions);

        // Solve for x and angles
        const {x , angles } : {x:number, angles: number[]} = solveAngles(expressions,options.angleSum)

        // labels are just expressions as strings
        const labels = expressions.map( e => `${e.toStringP()}^\\circ`) 

        // missing values are the ones which aren't constant
        const missing = expressions.map( e => !e.isConstant())

        return new MissingAnglesAlgebraData (angles,missing,options.angleSum,labels,x)
    }
}

/** Given a set of expressions, set their sum  */
function solveAngles(expressions: LinExpr[], angleSum: number) : {x: number, angles: number[]} {
    const expressionSum = expressions.reduce( (exp1,exp2) => exp1.add(exp2) );
    const x = LinExpr.solve(expressionSum,new LinExpr(0,angleSum));

    const angles = [];
    expressions.forEach(function(expr) {
        let angle = expr.eval(x);
        if (angle <= 0) {
            throw "negative angle";
        } else {
            angles.push(expr.eval(x))
        }
    });

    return( {x: x, angles: angles})
}

function makeMixedExpressions(n: number, options: Options) : LinExpr[] {
    let expressions: LinExpr[] = []
    const x = randBetween(options.minXValue, options.maxXValue);
    let left = options.angleSum;
    let allconstant = true;
    for (let i = 0; i < n - 1; i++) {
        let a = randBetween(1, options.maxCoefficient);
        left -= a * x;
        let maxb = Math.min(left - options.minAngle * (n - i - 1), options.maxConstant);
        let minb = options.minAngle - a * x;
        let b = randBetween(minb, maxb);
        if (a !== 0) { allconstant = false };
        left -= b;
        expressions.push(new LinExpr(a, b));
    }
    let last_minX_coeff = allconstant ? 1 : options.minCoefficient;
    let a = randBetween(last_minX_coeff, options.maxCoefficient);
    let b = left - a * x;
    expressions.push(new LinExpr(a, b));

    return expressions
}

function makeAddExpressions(n: number, options: Options) : LinExpr[] {
    let expressions: LinExpr[] = []
    let angles: number[] = []
    const constants = (options.includeConstants === true || weakIncludes(options.includeConstants, 'add'));
    if (n === 2 && options.ensureX && constants) n = 3;

    const x = randBetween(options.minXValue, options.maxXValue);
    let left = options.angleSum;
    let anglesLeft = n;

    // first do the expressions ensured by ensure_x and constants
    if (options.ensureX) {
        anglesLeft--;
        expressions.push(new LinExpr(1, 0));
        angles.push(x);
        left -= x;
    }

    if (constants) {
        anglesLeft--;
        let c = randBetween(
            options.minAngle,
            left - options.minAngle * anglesLeft
        );
        expressions.push(new LinExpr(0, c));
        angles.push(c);
        left -= c;
    }

    // middle angles
    while (anglesLeft > 1) {
        // add 'x+b' as an expression. Make sure b gives space
        anglesLeft--;
        left -= x;
        let maxb = Math.min(
            left - options.minAngle * anglesLeft,
            options.maxConstant
        );
        let minb = Math.max(
            options.minAngle - x,
            -options.maxConstant
        );
        let b = randBetween(minb, maxb);
        expressions.push(new LinExpr(1, b));
        angles.push(x + b);
        left -= b;
    }

    // last angle
    expressions.push(new LinExpr(1, left - x));
    angles.push(left);

    return expressions
}

function makeMultiplicationExpressions(n: number, options: Options) : LinExpr[] {
    let expressions : LinExpr[] = []

    // choose a total of coefficients
    // pick x based on that
    const constants = (options.includeConstants === true || weakIncludes(options.includeConstants, 'mult'));
    if (n === 2 && options.ensureX && constants) n = 3;

    let anglesleft = n;
    const totalCoeff = constants ?
        randBetween(n, (options.angleSum - options.minAngle) / options.minAngle, Math.random) : // if it's too big, angles get too small
        randElem([3, 4, 5, 6, 8, 9, 10].filter(x => x >= n), Math.random);
    let coeffleft = totalCoeff;
    let left = options.angleSum;

    // first 0/1/2
    if (constants) {
        // reduce to make what's left a multiple of total_coeff
        anglesleft--;
        let newleft = randMultBetween(totalCoeff * options.minAngle, options.angleSum - options.minAngle, totalCoeff);
        let c = options.angleSum - newleft;
        expressions.push(new LinExpr(0, c));
        left -= newleft;
    }

    let x = left / totalCoeff;

    if (options.ensureX) {
        anglesleft--;
        expressions.push(new LinExpr(1, 0));
        coeffleft -= 1;
    }

    //middle
    while (anglesleft > 1) {
        anglesleft--;
        let mina = 1;
        let maxa = coeffleft - anglesleft; // leave enough for others TODO: add max_coeff
        let a = randBetween(mina, maxa);
        expressions.push(new LinExpr(a, 0));
        coeffleft -= a;
    }

    //last
    expressions.push(new LinExpr(coeffleft, 0));
    return expressions
}