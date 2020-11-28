import Fraction from "fraction.js";
import Options from "Options";
import { PRIMES30, PRIMES50 } from "primes";
import { gcd, randBetween, randBetweenFilter, randElem } from "utilities";
import TextQ from "./TextQ";

interface customOptions { // for internal use
  denominators: 'same' | 'multiple' | 'sharedFactor',
  simplify: boolean | undefined,
  maxDenominator: number,
  maxIntegerPart: number,
  subtract: boolean
}

export default class FractionAddQ extends TextQ {
  /**
   * Random based on difficulty:
   * 1. Same denominator, proper, no simplifying
   * 2. Same denominator, proper, needs simplifying
   * 3. Denominator multiples, proper, may need simplifying (can I control this?)
   * 4. Denominator not multiples, proper, may need simplifying
   * 5. Small improper fractions, same denominator
   * 6. Improper, different denominator
   * 7. Three fractions, improper
   * 8. Three fractions with multiplication by integer
   * 9. ax + by a,b in |N, x, y in |Q
   * 10. Big numbers
   * 
   * @param options difficulty
   */
  static random(options: Options) : FractionAddQ{
    let addends: Fraction[]
    const subtract = (Math.random() < 0.5)
    switch(options.difficulty){
      case 1: { // common denominator, no simplifying
        const den = randElem(PRIMES30.filter(p=>p<20 && p>3)) // denominator is a prime
        const a = randBetween(1,den-2) + (subtract?1:0) // If subtacting want 2->den-1
        const b = subtract? -randBetween(1, a-1) :randBetween(1,den-a-1)
        addends = [new Fraction(a,den),new Fraction(b,den)]
        break
      }
      case 2: { // common denominator, simplifies
        const den = randBetweenFilter(4,20, n=> !PRIMES30.includes(n)) // non-prime
        const a = subtract?
          randBetweenFilter(2,den-1,n=>gcd(n,den)===1) :
          randBetweenFilter(1,den-2,n=>gcd(n,den)===1)         // non-simplifying. Guaranteed to exist since 1 works
        const b = subtract?
          -randBetweenFilter(1,a-1, n=> gcd(n,den)===1 && gcd(a-n,den)!==1) :
          randBetweenFilter(1,den-a-1, n=> gcd(n,den)===1 && gcd(a+n,den)!==1)
        addends = [new Fraction(a,den), new Fraction(b,den)]
        break
      }
      case 3: { // One denominator a multiple of another. Might simplify
        const den1 = randBetween(2,10)
        const multiplier = randBetween(2,5)
        const den2 = multiplier * den1

        let a: number
        let b: number
        if (Math.random()<0.5) { // big denominator second
          a = randBetweenFilter(1,den1-1, n=> gcd(n,den1)===1) 
          b = subtract?
            -randBetweenFilter(1,multiplier*a-1, n=> gcd(n,den2)===1) :
            randBetweenFilter(1,den2-multiplier*a-1, n=> gcd(n,den2)===1)
          addends = [new Fraction(a,den1), new Fraction(b, den2)]
        } else { // big denominator first
          a = subtract?
            randBetweenFilter(multiplier+1, den2-1, n=> gcd(n,den2)===1) :
            randBetweenFilter(1,den2-multiplier-1, n=> gcd(n,den2)===1)
          b = subtract?
            -randBetweenFilter(1, Math.floor(a/multiplier), n => gcd(n,den1)===1):
            randBetweenFilter(1,den1-Math.ceil(a/multiplier), n=> gcd(n,den1)===1)
          addends = [new Fraction(a,den2), new Fraction(b, den1)]
        }
        break
      }
      case 4:default:{ // Classic different denominators
        // n1/m1b + n2/m2b where m1,m2 coprime
        const b = randBetween(2,5)
        const m1 = randBetween(2,4)
        const m2 = randBetweenFilter(2,4, n=> gcd(m1,n)===1) 

        const d1 = b * m1
        const d2 = b * m2
        let n1: number
        let n2: number
        if (subtract) {
          n1 = randBetweenFilter(Math.ceil(m1/m2),d1-1, n=> gcd(n,d1)===1) // use pen and paper to derive this minimum
          n2 = -randBetweenFilter(1,d2-1, n=> (gcd(n,d2)===1 && (m2*n1 - m1*n > 0)))
        } else {
          n1 = randBetweenFilter(1,Math.floor(m1*b - m1/m2), n=> gcd(n,d2)===1) // use pen and paper
          n2 = randBetweenFilter(1, d2-1, n=> (gcd(n,d2)===1 && n1*m2+n*m1 < b*m1*m2))
        }
        addends = [new Fraction(n1,d1), new Fraction(n2,d2)]
      }
    }
    const question : string = addends[0].toLatex(true) + addends.slice(1).map(toSignedMixedLaTex).join('') // join with sign
    const answer : string = '=' + addends.reduce((prev,curr)=>prev.add(curr)).toLatex(true)

    return new this(question, answer, {questionClass: 'adjacent', answerClass: 'adjacent'})
  }

  static randomPair({denominators, maxDenominator, maxIntegerPart, simplify, subtract}: customOptions) : [Fraction,Fraction]{
    let f1: Fraction
    let f2: Fraction
    switch(denominators) {
      case 'same': {
        const d = 
          (simplify===true)?  randBetweenFilter(5,maxDenominator,n=>PRIMES50.includes(n)) :
          (simplify===false)? randBetweenFilter(4,maxDenominator,n=>!PRIMES50.includes(n)) :
          /*undefined*/       randBetween(4,maxDenominator)   
        const maxNumerator = (maxIntegerPart+1)*d-1
        let n1: number
        let n2: number
        if (subtract) {
          n1 = randBetweenFilter(2,maxNumerator, coPrimeWith(d))
          n2 = -randBetweenFilter(1,n1-1, coPrimeWith(d))
        } else {
          n1 = randBetweenFilter(1,maxNumerator, coPrimeWith(d))
          const filter: (n: number) => boolean =
            (simplify===true)?  n => coPrimeWith(d)(n) && !coPrimeWith(d)(n1+n):
            (simplify===false)? n => coPrimeWith(d)(n) && coPrimeWith(d)(n1+n):
                                n => coPrimeWith(d)(n)
          n2 = randBetweenFilter(1,maxNumerator-n1, filter)
        }
        f1 = new Fraction(n1,d)
        f2 = new Fraction(n2,d)
        break
      }
      case 'multiple': {
        const d1 = randBetween(2,10)
        const m = randBetween(2,5)
        const d2 = m * d1

        let n1: number
        let n2: number
        if (Math.random()<0.5) { // big denominator second
          n1 = randBetweenFilter(1,d1-1, n=> gcd(n,d1)===1) 
          n2 = subtract?
            -randBetweenFilter(1,m*n1-1, n=> gcd(n,d2)===1) :
            randBetweenFilter(1,d2-m*n1-1, n=> gcd(n,d2)===1)
          f1 = new Fraction(n1,d1)
          f2 = new Fraction(n2,d2)
        } else { // big denominator first
          n1 = subtract?
            randBetweenFilter(m+1, d2-1, n=> gcd(n,d2)===1) :
            randBetweenFilter(1,d2-m-1, n=> gcd(n,d2)===1)
          n2 = subtract?
            -randBetweenFilter(1, Math.floor(n1/m), n => gcd(n,d1)===1):
            randBetweenFilter(1,d1-Math.ceil(n1/m), n=> gcd(n,d1)===1)
          f1 = new Fraction(n1,d2)
          f2 = new Fraction(n2,d1)
        }
        break
      }
      case 'sharedFactor': {
        f1 = new Fraction(1,2)
        f2 = new Fraction(1,2)
      }
    }
    return [f1,f2]
  }

  static get commandWord() {return 'Calculate'}
}

function toSignedMixedLaTex(f: Fraction) : string{
  let latex = f.toLatex(true)
  if (!latex.startsWith('-')) latex = '+'+latex
  return latex
}

/** Curried function for point-free filtering */
function coPrimeWith(n: number) : (m:number)=>boolean {
  return (m => gcd(m,n)===1)
}