'use client';
import React, {useState} from 'react';
import StudentAssignToBatch from './modals/StudentAssignToBatch';

const StudentTablebyBatch = ({assignBatchTable, studentDataByBatch, filteredData}) => {
  const [isAssign, setAssign] = useState(false);
  const handleAssignModal = () => setAssign(!isAssign);
  const StdRow = ({name, phone, date, email, batch, sNo}) => {
    return (
      <tr className="flex w-full border-b justify-around">
        <td className="py-[16px] w-[10%] text-center">{sNo}</td>
        <td title={name} className="py-[16px] w-[30%] overflow-hidden whitespace-nowrap text-ellipsis text-center">
          {name}
        </td>
        <td className="py-[16px] w-[10%] text-center">{assignBatchTable ? '-' : batch}</td>
        <td className="py-[16px] w-[25%] text-center">{phone}</td>
        <td title={email} className="py-[16px] w-[30%] overflow-hidden whitespace-nowrap text-ellipsis text-center">
          {email}
        </td>
        <td className="py-[16px] items-center flex justify-center w-[15%] gap-[10px]  text-center">
          {date}{' '}
          {assignBatchTable ? (
            <button
              onClick={handleAssignModal}
              className="bg-green-400 text-[12px] font-semibold rounded-[16px] text-white px-[8px] py-[5px]">
              Assign
            </button>
          ) : (
            ''
          )}
        </td>
      </tr>
    );
  };
  return (
    <>
      <table className="w-full overflow-auto scroll-style rounded-[16px] h-full flex flex-col">
        <thead className="bg-black absolute flex w-[100%] top-0 left-0 text-white">
          <tr className="justify-around flex w-[100%]">
            <th className="py-[13px] w-[10%]">Sno</th>
            <th className="py-[13px] w-[30%]">Name</th>
            <th className="py-[13px] w-[10%]">Batch</th>
            <th className="py-[13px] w-[25%]">Phone</th>
            <th className="py-[13px] w-[30%]">Email</th>
            <th className="py-[13px] w-[15%]">Date</th>
          </tr>
        </thead>
        <tbody className="mt-[50px]">
          {(assignBatchTable ? filteredData : studentDataByBatch).map(({name, batch, phone, email, date}, idx) => (
            <StdRow key={idx + 1} sNo={idx + 1} name={name} batch={batch} phone={phone} email={email} date={date} />
          ))}
        </tbody>
      </table>
      <StudentAssignToBatch handleModal={handleAssignModal} isModal={isAssign} />
    </>
  );
};
export default StudentTablebyBatch;
