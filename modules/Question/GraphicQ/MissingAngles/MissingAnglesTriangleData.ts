/* Extends MissingAnglesNumberData in order to do isosceles triangles, which generate a bit differently */

import { firstUniqueIndex, sortTogether } from 'Utilities'
import { GraphicQData } from '../GraphicQ'
import { MissingAnglesNumberData} from './MissingAnglesNumberData'
import { MissingAngleOptions } from './NumberOptions'

type Options = MissingAngleOptions & {givenAngle?: 'apex' | 'base'}

export default class MissingAnglesTriangleData extends MissingAnglesNumberData {
    apex?: 0 | 1 | 2 | undefined // which of the three given angles is the apex of an isosceles triangle
    constructor(angleSum: number, angles: number[], missing: boolean[], angleLabels?: string[], apex?: 0|1|2|undefined) {
        super(angleSum,angles,missing,angleLabels)
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

        question.initLabels()

       return question
    } 

    initLabels(): void {
        const n = this.angles.length
        let j = 0 // keep track of unknowns
        for (let i = 0; i < n; i++) {
            if (!this.missing[i]) {
                this.angleLabels[i] = `${this.angles[i].toString()}^\\circ`
            } else {
                this.angleLabels[i] = `${String.fromCharCode(120 + j)}^\\circ` // 120 = 'x'
                j++
            }
        }
    }

}