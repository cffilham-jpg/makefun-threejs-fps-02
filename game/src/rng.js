export function seeded(n) {
  return ()=> {
    n=(n+0x6d2b79f5)|0;
    let x=Math.imul(n^(n>>>15),n|1);
    x^=x+Math.imul(x^(x>>>7),x|61);
    return ((x^(x>>>14))>>>0)/4294967296;
  };
}
