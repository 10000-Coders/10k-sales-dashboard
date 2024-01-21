import {
  LeftArrow,
  OrangeLable,
  RightArrow,
} from "@/shared/svgImages/tableImages";
import "./studentTable.module.css";
import StudentRow from "../StudentRow";
import {tableData} from "@/shared/static/studentsData.json"

const StudetTable = () => {
  return (
    <main className="flex flex-col items-end gap-[10px]">
      <div className="w-full gap-[24px] flex text-[16px] font-[700] justify-end">
        <p>1 - 9 of 55</p>{" "}
        <div className="flex">
          <LeftArrow className="cursor-pointer" />
          <RightArrow className="cursor-pointer" />
        </div>
      </div>
      <table className="shadow-[0_4px_4px_0px_rgba(0,0,0,0.25)] flex flex-col rounded-[16px] overflow-hidden w-[100%]">
        <thead className="bg-black flex w-[100%]  text-white">
          <tr className="flex w-[100%] justify-between items-center">
            <th className="flex flex-shrink-0 items-center w-[8%] pl-[20px] gap-[20px] py-[16px]">
              <OrangeLable /> #{" "}
            </th> 
            <th className="py-[13px] flex-shrink-0 w-[20%] text-ellipsis text-center  whitespace-nowrap overflow-hidden ">Name</th>
            <th className="py-[13px] flex-shrink-0 w-[6%] text-center">Batch</th>
            <th className="py-[13px] flex-shrink-0 w-[10%] text-center">Attendance</th>
            <th className="py-[13px] flex-shrink-0 w-[10%] text-ellipsis text-center whitespace-nowrap overflow-hidden ">Phone</th>
            <th className="py-[13px] flex-shrink-0 w-[162px]">Status</th>
            <th className="py-[13px] w-[15%] text-ellipsis text-center  whitespace-nowrap overflow-hidden">Sales person</th>
            <th className="py-[13px] text-center flex-shrink-0 w-[15%]">Date</th>
          </tr>
        </thead>
        <tbody>
          {tableData.map((item, idx) => (
            <StudentRow
              request={item.request}
              name={item.name}
              sales={item.sales}
              batch={item.batch}
              attendance={item.attendance}
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
