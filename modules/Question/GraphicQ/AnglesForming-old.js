import {randBetween} from 'Utilities/Utilities';

export default class AnglesForming {
    constructor(anglesum, angles, missing) {
        // angles :: [int]
        // missing :: [boolean]

        if (angles === []) {throw new Error("argument must not be empty")};
        if (Math.round(angles.reduce((x,y) => x+y)) !== anglesum) {throw new Error("Angle sum must be " + anglesum)};

        this.angles = angles;
        this.missing = missing;
        this.anglesum = anglesum;
        this.type = "anglesforming";
        this.subtype = "simple";
    }

    static random(anglesum,options) {
        const defaults = {
            min_angle: 10,
            min_n: 2,
            max_n: 4
        }
        const settings = Object.assign({},defaults,options);

        const n = settings.n?
            settings.n :
            randBetween(settings.min_n, settings.max_n);

        const minangle = settings.min_angle;

        if (n < 2) return null;

        let angles = [];
        let left = anglesum;
        for (let i=0; i<n-1; i++) {
            let maxangle = left - minangle*(n-i-1);
            let nextangle = randBetween(minangle,maxangle);
            left -= nextangle;
            angles.push(nextangle);
        }
        angles[n-1] = left;

        let missing = [];
        missing.length = n;
        missing.fill(false);
        missing[randBetween(0,n-1)] = true;

        return new AnglesForming(anglesum,angles,missing);
    }

    static randomrep(anglesum,options) {
        // n: number of angle
        // m: number of repeated angles (must be <= n)
        const defaults = {
            min_angle: 10,
            min_n: 3,
            max_n: 4,
            min_missing: 2,
            max_missing: Infinity
        }
        const settings = Object.assign({},defaults,options);
        
        const n = settings.n?
            settings.n :
            randBetween(settings.min_n, settings.max_n);

        const m = settings.nmissing?
            settings.nmissing :
            Math.random() < 0.1 ? n : randBetween(2,n-1);

        const minangle = settings.min_angle;

        if (n < 2 || m < 1 || m > n) throw "invalid arguments";

        // All missing - do as a separate case
        if (n === m) {
            console.log("n=m case");
            let angles = [];
            angles.length = n;
            angles.fill(anglesum/n);
            let missing = [];
            missing.length = n;
            missing.fill(true);

            return new AnglesForming(anglesum,angles,missing);
        }

        let angles = [];
        let missing = [];
        missing.length = n;
        missing.fill(false);

        // choose a value for the missing angles
        const maxrepangle = (anglesum-minangle*(n-m))/m;
        const repangle = randBetween(minangle,maxrepangle);

        // choose values for the other angles
        let otherangles = [];
        let left = anglesum - repangle*m;
        for (let i=0; i<n-m-1; i++) {
            let maxangle = left - minangle*(n-m-i-1);
            let nextangle = randBetween(minangle,maxangle);
            left -= nextangle;
            otherangles.push(nextangle);
        }
        otherangles[n-m-1] = left;

        // choose where the missing angles are
        {
        let i=0;
        while (i<m) {
            let j = randBetween(0,n-1);
            if (missing[j] === false) {
                missing[j] = true;
                angles[j] = repangle;
                i++
            }
        }
        }

        // fill in the other angles
        {
        let j=0;
        for (let i=0;i<n;i++) {
            if (missing[i] === false) {
                angles[i] = otherangles[j];
                j++
            }
        }
        }
        const question = new AnglesForming(anglesum,angles,missing);
        question.subtype = "repeated";
        return question;
    }
}

