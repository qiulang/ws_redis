// type key = "a" | "b" | "c"
const def_val: Record<string, string> = {a:"debug",b:"info",c:"warning"};

function work(y: string) {
    let x = def_val[y] || def_val.a;
    // let x:string
    // if (y!='a' && y!='b' && y!='c') {
    //     x = def_val.a;
    // } else {
    //     x = def_val[y]
    // }
}