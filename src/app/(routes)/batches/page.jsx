'use client';
import BatchModal from '@/components/modals/AddBatchModal';
import ReleaseConfirmationModal from '@/components/modals/ReleaseConfirmationModal';
import StudentTablebyBatch from '@/components/StudentTablebyBatch';
import {Search} from '@/shared/svgImages/navBarImages';
import {AddIcon} from '@/shared/svgImages/tableImages';
import React, {useState} from 'react';
import Select from 'react-select';

export default function Batches() {
  const [filteredData, setfilteredData] = useState([]);
  const studentDataByBatch = [
    {
      name: 'Jayadeep kulshekhar',
      phone: '7887890986',
      date: '22/12/23',
      email: 'jayadeepkulshekhar@gmai.com',
      batch: '101',
    },
    {
      name: 'Raghavendra Rao Kandula',
      phone: '8373625125',
      date: '22/12/23',
      email: 'raghavendraraoKandula@gmail.com',
      batch: '102',
    },
    {
      name: 'Ananya Reddy Gaddam',
      phone: '9083625362',
      date: '22/12/23',
      email: 'ananyareddygaddam@gmail.com',
      batch: '103',
    },
  ];
  const [selectedBatch, setselectedBatch] = useState({
    label: 'Select batch',
    value: 'select batch',
  });
  const [isBatchModal, setBatchModal] = useState(false);
  const [SearchInput, setSearchInput] = useState('');
  const [isReleaseModal, setReleaseModal] = useState(false);
  const handleReleaseBatchModal = () => setReleaseModal(!isReleaseModal);

  const handleSearchInput = e => {
    setSearchInput(e.target.value);
    const filterData = studentDataByBatch.filter(
      ({name}) => name.toLowerCase().indexOf(SearchInput.toLowerCase()) !== -1,
    );
    setfilteredData(filterData);
  };
  const handleBatchModal = () => setBatchModal(!isBatchModal);
  const handleSetbatch = selectedItem => setselectedBatch(selectedItem);
  const batchOptions = [
    {label: '101', value: '101'},
    {label: '102', value: '102'},
    {label: '103', value: '103'},
    {label: '104', value: '104'},
    {label: '105', value: '105'},
  ];
  const batchStyles = {
    option: (provided, state) => ({
      cursor: 'pointer',
      paddingBlock: '10px',
      paddingInline: '15px',
      fontWeight: '600',
      textAlign: 'center',
      position: 'relative',
      '&:hover': {
        background: 'rgb(0,0,0,0.05)',
      },
    }),
    control: (provided, state) => ({
      ...provided,
      border: '0',
      boxShadow: 'none',
      '&:hover': {
        borderColor: 'none',
      },
      '&:active': {
        outline: 'none',
      },
      // backgroundColor: salesBgcolor,
      // color: salesColor,
      cursor: 'pointer',
      fontWeight: '600',
      textAlign: 'center',
      height: '100%',
      borderRadius: '16px',
      boxShadow: '1px 1px 6px rgb(0,0,0,0.1)',
      width: '200px',
    }),
    singleValue: provided => ({
      ...provided,
      // color: salesColor,
      borderRadius: '16px',
    }),
    dropdownIndicator: base => ({
      ...base,
      color: 'black',
      '&:hover': {
        color: 'black',
      },
    }),
  };

  return (
    <main className="w-[calc(100%-251.6px)] flex flex-col gap-[40px] h-[100vh] py-[30px] px-[40px] float-right">
      <div className="flex justify-between">
        <div className="w-[180px] gap-[20px] flex-shrink-0 flex">
          <Select
            styles={batchStyles}
            placeholder="Select Batch"
            options={batchOptions}
            value={selectedBatch}
            onChange={handleSetbatch}
            isSearchable={false}
          />
          <button
            onClick={handleBatchModal}
            className="flex font-semibold flex-shrink-0 items-center gap-[10px] px-[10px] shadow rounded-[16px]">
            Add Batch <AddIcon fill="#FF8000" />
          </button>
        </div>
        <div className="w-[200px] px-[15px] bg-[#ECECEC] rounded-[32px] gap-[10px] items-center flex h-[53px]">
          <label htmlFor="search">
            <Search />
          </label>
          <input
            type="text"
            placeholder="Search Student"
            className="placeholder:text-[16px] bg-inherit w-full placeholder:text-black focus:outline-none font-[400]"
            name="search"
            id="search"
            onChange={handleSearchInput}
            value={SearchInput}
          />
        </div>
      </div>
      <div className="border relative overflow-hidden rounded-[16px] shadow w-full flex-shrink-0 h-[200px]">
        {!SearchInput ? (
          ''
        ) : (
          <StudentTablebyBatch
            searchInput={SearchInput}
            studentDataByBatch={studentDataByBatch}
            filteredData={filteredData}
            assignBatchTable={true}
          />
        )}
      </div>
      <div className="flex  gap-[10px] flex-col">
        <p className="text-[20px] font-semibold">
          Assigned students for the Batch : {selectedBatch.value === 'select batch' ? '' : selectedBatch.value}
        </p>

        <div className="border overflow-auto scroll-style relative rounded-[16px] shadow w-full flex-shrink-0 h-[220px]">
          <StudentTablebyBatch
            searchInput={SearchInput}
            assignBatchTable={false}
            studentDataByBatch={studentDataByBatch}
            filteredData={filteredData}
          />
        </div>
        <button
          onClick={handleReleaseBatchModal}
          className="flex ml-auto font-semibold flex-shrink-0 items-center gap-[10px] p-[10px] shadow rounded-[16px]">
          Release Batch <AddIcon fill="#FF8000" />
        </button>
      </div>
      <BatchModal handleModal={handleBatchModal} isModal={isBatchModal} />
      <ReleaseConfirmationModal handleModal={handleReleaseBatchModal} isModal={isReleaseModal} />
    </main>
  );
}
