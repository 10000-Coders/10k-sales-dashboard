"use client";
import {
  Carret,
  LeftArrow,
  LinkIcon,
  OrangeLable,
  RightArrow,
} from "@/shared/svgImages/tableImages";
import { useState } from "react";
const StudetTable = () => {
  const [activeRow, setActiveRow] = useState(false);
  const handleActiveRow = () => {
    setActiveRow(!activeRow);
  };
  const Row = () => {
    return (
      <>
        <tr
          onClick={handleActiveRow}
          className="text-[14px] cursor-pointer border border-[#9B9B9B] font-[400]"
        >
          <td className="flex items-center pl-[20px] gap-[20px] py-[16px]">
            <OrangeLable /> <p>110</p>
          </td>
          <td className="py-[16px] text-center">Jayadeep Kulshekhar</td>
          <td className="py-[16px] text-center">salesperson-1</td>
          <td className="py-[16px] text-center">7887890986</td>

          <td className="py-[16px] w-[150px]">
            <div className="font-[600] py-[4px] flex justify-center rounded-[16px] items-center bg-[#96E367]">
              <p> intrested</p> <Carret />
            </div>
          </td>
          <td className="text-center">22/12/23</td>
        </tr>
        {activeRow && (
          <tr className="border-t border-dotted border-black">
            <td colSpan={-1}>
              <p className="text-[10px] font-[700] text-[#FF8000]">
                Student Details
              </p>
              <div className="text-[14px] justify-between w-full border flex">
                <p className="flex gap-[5px]">
                  Email :
                  <span className="font-[700] inline">
                    Jayadeep.kul289@gmail.com
                  </span>
                  <LinkIcon className="inline" />
                </p>
                <p className="flex gap-[5px]">
                  Highest Degree :{" "}
                  <span className="font-[700]"> Mech Eng.</span>
                </p>
                <div className="flex items-center gap-[5px]">
                  <p>Approached via : </p>
                  <div className="flex gap-[10px]">
                    <input type="radio" name="approach" id="online" />
                    <label htmlFor="online">Online</label>
                    <input type="radio" name="approach" id="Offline" />
                    <label htmlFor="Offline">Offline</label>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        )}
      </>
    );
  };

  return (
    <main className="ml-[50px] flex flex-col items-end gap-[10px]">
      <div className="w-full gap-[24px] flex text-[16px] font-[700] justify-end">
        <p>1 - 9 of 55</p>{" "}
        <div className="flex">
          <LeftArrow className="cursor-pointer" />
          <RightArrow className="cursor-pointer" />
        </div>
      </div>
      <table className="shadow-[0_4px_4px_0px_rgba(0,0,0,0.25)] rounded-[16px]  overflow-hidden w-[70rem]">
        <thead className="bg-black text-white">
          <tr>
            <th className="py-[13px]">Request # </th>
            <th className="py-[13px]">Name</th>
            <th className="py-[13px]">Sales Person</th>
            <th className="py-[13px]">Phone</th>
            <th className="py-[13px]">Status</th>
            <th className="py-[13px]">Date</th>
          </tr>
        </thead>
        <tbody>
          <Row />
        </tbody>
      </table>
    </main>
  );
};
export default StudetTable;
