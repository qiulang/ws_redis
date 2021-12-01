// type key = "a" | "b" | "c"
// const def_val: Record<string, string> = {a:"debug",b:"info",c:"warning"};
const def_val = {a:"debug",b:"info",c:"warning"};
// type dk = keyof typeof def_val;
//as keyof typeof

function work(y:keyof typeof def_val) {
    let x = def_val[y] || def_val.a;
    // let x:string
    // if (y!='a' && y!='b' && y!='c') {
    //     x = def_val.a;
    // } else {
    //     x = def_val[y]
    // }
}