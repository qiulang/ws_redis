const people = [
    {
      name: 'Mike Smith',
      family: {
        mother: 'Jane Smith',
        father: 'Harry Smith',
        sister: 'Samantha Smith'
      },
      age: 35
    },
    {
      name: 'Tom Jones',
      family: {
        mother: 'Norah Jones',
        father: 'Richard Jones',
        brother: 'Howard Jones'
      },
      age: 25
    }
  ];
  
  interface df  {
    name:string,
    family?:{
        mother: string,
        father: string,
        brother?: string,
        sister?: string
    } 
    age:number
  }
  
  for (const {name: n, family: {father: f}} of people) {
    console.log('Name: ' + n + ', Father: ' + f);
  }

  //https://stackoverflow.com/questions/35435042/how-can-i-define-an-array-of-objects
  // df[] 不是 [df]
  function dec(p:df[]) {
    for (const d of p) {
        console.log(d.family?.brother)
    }
  }
  dec(people)
  