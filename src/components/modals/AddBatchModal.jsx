import React, { useState } from "react";
import ModalComponent from "./index";
import { CrossIcon } from "@/shared/svgImages/tableImages";

const BatchModal = ({ handleModal, isModal }) => {
  const [batch, setBatch] = useState("");

  const handleInputBatchNum = (e) => {
    setBatch(e.target.value);
  };

  const handleClearInput = () => {
    setBatch("");
  };

  return (
    <ModalComponent handleModal={handleModal} isModal={isModal}>
      <div className="bg-white w-[500px] flex relative flex-col gap-[20px] pt-[50px] h-[300px]">
        <p className="font-bold text-[24px]">Enter the Batch Number</p>
        <div className="flex flex-col gap-[30px]">
          <div className="flex w-[100px] mx-auto gap-[20px]">
            <input
              type="text"
              name="batch"
              className="focus:outline-none text-center w-full block border-b font-semibold border-black "
              onChange={handleInputBatchNum}
              maxLength={5}
              value={batch}
            />
            {batch && (
              <button className="font-bold" onClick={handleClearInput}>
                &#10005;
              </button>
            )}
          </div>
          <button className="px-[20px] py-[8px] w-fit mx-auto font-semibold text-white bg-vivid_orange rounded-[16px]">
            Submit
          </button>
          <div onClick={handleModal} className="absolute cursor-pointer right-[10px] top-[10px]">
            <CrossIcon />
          </div>
        </div>
      </div>
    </ModalComponent>
  );
};

export default BatchModal;
