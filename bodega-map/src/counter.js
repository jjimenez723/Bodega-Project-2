export function setupCounter(element) {
  // Keep local counter state for the demo button.
  let counter = 0;

  const setCounter = (count) => {
    counter = count;
    element.innerHTML = `count is ${counter}`;
  };

  // Increment on click.
  element.addEventListener("click", () => setCounter(counter + 1));
  setCounter(0);
}
