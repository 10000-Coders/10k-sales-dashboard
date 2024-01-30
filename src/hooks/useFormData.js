const useFormData = (inputField) => {
  const formDataInputs = new FormData();
  for (let x in inputField) {
    formDataInputs.append([x], inputField[x]);
  }
  return formDataInputs;
};

export default useFormData;
