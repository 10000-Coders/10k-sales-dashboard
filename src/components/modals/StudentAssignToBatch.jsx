'use client';
import React, {useState} from 'react';
import ModalComponent from '.';
import Select from 'react-select';
import {AddIcon} from '@/shared/svgImages/tableImages';

const StudentAssignToBatch = ({handleModal, isModal}) => {
  const [selectedBatch, setselectedBatch] = useState({
    label: 'Select batch',
    value: 'select batch',
  });
  const batchOptions = [
    {label: '101', value: '101'},
    {label: '102', value: '102'},
    {label: '103', value: '103'},
    {label: '104', value: '104'},
    {label: '105', value: '105'},
  ];
  const handleSetbatch = selectedItem => setselectedBatch(selectedItem);

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
    menu: (provided, state) => ({
      ...provided,
      maxHeight: '100px',
      overflow: 'auto',
      '&::-webkit-scrollbar': {
        width: '5px',
        backgroundColor: 'rgba(216, 113, 56, 0.5)',
      },
      '&::-webkit-scrollbar-thumb': {
        background: '#d87138',
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
    <ModalComponent isModal={isModal} handleModal={handleModal}>
      <div className="w-[500px] relative p-[7px] flex flex-col gap-[40px] bg-white h-[300px]">
        <button
          type="button"
          onClick={handleModal}
          className="absolute top-3 end-2.5 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white"
          data-modal-hide="popup-modal">
          <svg
            className="w-3 h-3"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 14 14">
            <path
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
            />
          </svg>
        </button>
        <p className="font-semibold text-[25px] text-black text-center">Select a batch to Assign the student</p>
        <div className="w-fit flex flex-col gap-[20px] mx-auto">
          <Select
            styles={batchStyles}
            placeholder="Select Batch"
            options={batchOptions}
            value={selectedBatch}
            onChange={handleSetbatch}
          />
          <button className="flex font-semibold w-fit mx-auto text-white bg-vivid_orange flex-shrink-0 items-center gap-[10px] p-[10px] px-[20px] shadow rounded-[16px]">
            Assign
          </button>{' '}
        </div>
      </div>
    </ModalComponent>
  );
};

export default StudentAssignToBatch;
