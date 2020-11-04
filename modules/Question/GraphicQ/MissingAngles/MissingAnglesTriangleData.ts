/* Extends MissingAnglesNumberData in order to do isosceles triangles, which generate a bit differently */

import { firstUniqueIndex, sortTogether } from 'Utilities'
import { GraphicQData } from '../GraphicQ'
import { MissingAnglesNumberData, Options as ParentOptions} from './MissingAnglesNumberData'

type Options = ParentOptions & {givenAngle?: 'apex' | 'base'}

export default class MissingAnglesTriangleData extends MissingAnglesNumberData {
    apex: 0 | 1 | 2 | undefined // which of the three given angles is the apex of an isosceles triangle
    constructor(angleSum: number, angles: number[], missing: boolean[], apex?: 0|1|2|undefined) {
        super(angleSum,angles,missing)
        this.apex = apex
    }

    static randomRepeated(options: Options) {
        options.nMissing = 2
        options.givenAngle = options.givenAngle || Math.random() < 0.5? 'apex' : 'base'

        // generate the random angles with repetition first before marking apex for drawing
        let question = super.randomRepeated(options) as MissingAnglesTriangleData // allowed since undefined \in apex

        // Old implementation had sorting the array - not sure why
        // sortTogether(question.angles,question.missing,(x,y) => x - y)

        question.apex = firstUniqueIndex(question.angles) as 0 | 1 | 2
        question.missing = [true,true,true]
        
        if (options.givenAngle === 'apex') {
            question.missing[question.apex] = false;
        } else {
            question.missing[(question.apex + 1)%3] = false;
        }

       return question
    } 

}