import { ExpressionType } from "./MissingAnglesAlgebraData";
import { NumberOptions } from "./NumberOptions";

export interface AlgebraOptions extends NumberOptions {
    expressionTypes?: ExpressionType[];             // The type of expressions to appear
    includeConstants?: boolean | ExpressionType[];  // Do we make sure to have constant angles?
    minCoefficient?: number;    // Smallest value for any coefficient
    maxCoefficient?: number;
    maxConstant?: number;       // largest value for any constant
    minXValue?: number;         // smallest solution for x
    maxXValue?: number;
    ensureX?: boolean           // ensure one of the angles is just 'x;
}