const array = [1, 2, 6, 12, 4, 5]

// Checks whether an element is even
const bigger = (element) => {
  console.log(element)
  return element >= 6
}

// let r = array.some(bigger)

console.log(array.some(bigger))
