"use client";
import {
  Carret,
  EmailIcon,
  LeftArrow,
  LinkIcon,
  LockIcon,
  OrangeLable,
  RightArrow,
} from "@/shared/svgImages/tableImages";
import { useState } from "react";
import Select from "react-select";
import "./studentTable.module.css"

const StudetTable = ({ filterItemBy }) => {
  const [activeRow, setActiveRow] = useState(0);
  const [showCollapse, setShowCollapse] = useState(false);
  const handleActiveRow = (request) => {
    setActiveRow(request);
    setShowCollapse((prev) => (activeRow === request ? !prev : true));
  };

  const tableData = [
    {
      request: 110,
      name: "Jayadeep kulshekhar",
      phone: "7887890986",
      status: "Interested",
      date: "22/12/23",
      email: "Jayadeep kulshekhar",
      highestDegree: "Mech Eng",
      sales: "",
    },
    {
      request: 111,
      name: "Raghavendra Rao Kandula",
      phone: "8373625125",
      status: "Unavailable",
      date: "22/12/23",
      email: "raghavendraraoKandula@gmail.com",
      highestDegree: "Mech Eng",
      sales: "Nick fury",
    },
    {
      request: 112,
      name: "Ananya Reddy Gaddam",
      phone: "9083625362",
      status: "Ready to Pay",
      date: "22/12/23",
      email: "ananyareddygaddam@gmail.com",
      highestDegree: "Mech Eng",
      sales: "Steve jobs",
    },
  ];
  const style1 = {
    control: (base, state) => ({
      ...base,
      border: "none",
      boxShadow: "none",
      "&:hover": {
        outline: "none",
        border: "none",
      },
      borderRadius: "16px",
      fontWeight: "bold",
      background: "#E6E6E6",
    }),
  };
  const style2 = {
    control: (base, state) => ({
      ...base,
      border: "none",
      boxShadow: "none",
      "&:hover": {
        outline: "none",
        border: "none",
      },
      borderRadius: "16px",
      fontWeight: "bold",
      background: "#E6E6E6",
    }),
  };
  const statusOption = [
    {
      value: "Interested",
      label: "Interested",
    },
    {
      value: "Unavailable",
      label: "Unavailable",
    },
    {
      value: "Ready to Pay",
      label: "Ready to Pay",
    },
    {
      value: "Not Interested",
      label: "Not Interested",
    },
  ];
  const Row = ({
    request,
    name,
    sales,
    phone,
    status,
    date,
    email,
    highestDegree,
  }) => {
    return (
      <>
        <tr
          onClick={() => {
            handleActiveRow(request);
          }}
          className={`text-[14px] cursor-pointer ${
            activeRow === request && showCollapse
              ? "border-b border-black  border-dotted"
              : "border"
          }  font-[400]`}
        >
          <td className="flex items-center pl-[20px] gap-[20px] py-[16px]">
            <OrangeLable /> <p>{request}</p>
          </td>
          <td className="py-[16px] text-center">{name}</td>
          <td className="py-[16px] text-center">{sales ? sales : "-"}</td>
          <td className="py-[16px] text-center">{phone}</td>

          <td className="py-[16px] w-[150px]">
            {  <div
              onClick={handleStatusClick}
              className={`font-[600] py-[4px] flex justify-center rounded-[16px] items-center ${
                status === "Interested"
                  ? "bg-[#96E367]"
                  : status == "Unavailable"
                  ? "bg-[#3D3D3D] text-white"
                  : "bg-[#F68737] text-white"
              } `}
            >
              <p> {status}</p>{" "}
              <Carret stroke={status === "Interested" ? "black" : "white"} />
            </div>}
          {/* {<div onClick={handleStatusClick}>
            <Select
              styles={style2}
              options={statusOption}
            />
          </div>} */}
          </td>
          <td className="text-center">{date}</td>
        </tr>
        {activeRow === request && showCollapse ? (
          <tr>
            <td className="px-[50px] py-[10px]" colSpan="6">
              <div className="flex py-[15px] flex-col gap-[30px]">
                <div className="flex flex-col gap-[10px]">
                  <p className="text-[10px] uppercase font-[700] text-[#FF8000]">
                    Student Details
                  </p>
                  <div className="text-[14px] justify-between w-full flex">
                    <p className="flex gap-[5px]">
                      Email :<span className="font-[700] inline">{email}</span>
                      <LinkIcon className="inline" />
                    </p>
                    <p className="flex gap-[5px]">
                      Highest Degree :{" "}
                      <span className="font-[700]">{highestDegree}</span>
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
                </div>
                <div className="flex flex-col gap-[10px]">
                  <p className="text-[10px] uppercase font-[700] text-[#FF8000]">
                    communication details
                  </p>
                  <div className="flex  gap-[20px]">
                    <div className="flex flex-shrink-0 gap-[10px] items-center w-[40%]">
                      <p className="w-fit flex-shrink-0">Sales Executive:</p>{" "}
                      <Select
                        styles={style1}
                        placeholder="Name"
                        isSearchable={false}
                        className="w-full focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-[10px] w-full items-center">
                      <label htmlFor="remarks" className="flex-shrink-0">
                        Call Remarks
                      </label>
                      <input
                        type="text"
                        id="remarks"
                        placeholder="Remarks"
                        className="focus:outline-none w-full rounded-[16px] py-[7px] px-[10px] bg-[#E6E6E6]"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex mx-auto gap-[60px]">
                  <button className="w-[300px] py-[10px] rounded-[16px] bg-[#FF8000] flex justify-center gap-[10px] text-white font-bold">
                    <EmailIcon /> Send Payment Link on Email
                  </button>
                  <button className="w-[300px] py-[10px] rounded-[16px] bg-[#B5B5B5] flex justify-center gap-[10px] text-white font-bold">
                    <LockIcon /> Give Dashboard Access
                  </button>
                </div>
              </div>
            </td>
          </tr>
        ) : (
          ""
        )}
      </>
    );
  };

  const handleStatusClick = (e) => {
    e.stopPropagation();
  };

  return (
    <main className="flex flex-col items-end gap-[10px]">
      <div className="w-full gap-[24px] flex text-[16px] font-[700] justify-end">
        <p>1 - 9 of 55</p>{" "}
        <div className="flex">
          <LeftArrow className="cursor-pointer" />
          <RightArrow className="cursor-pointer" />
        </div>
      </div>
      <table className="shadow-[0_4px_4px_0px_rgba(0,0,0,0.25)] rounded-[16px]  overflow-hidden w-[100%]">
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
          {tableData.map((item, idx) => (
            <Row
              request={item.request}
              name={item.name}
              sales={item.sales}
              phone={item.phone}
              status={item.status}
              date={item.date}
              email={item.email}
              highestDegree={item.highestDegree}
            />
          ))}
        </tbody>
      </table>
    </main>
  );
};
export default StudetTable;
