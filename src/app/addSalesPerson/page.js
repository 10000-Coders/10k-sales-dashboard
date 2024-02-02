'use client';
import {HomeIcon, IdIcon, MailIcon} from '@/shared/svgImages/assignNewSales/sales';
import React from 'react';
import Link from 'next/link';
import {useState} from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {salesApproval} from '@/redux/features/user/userAuth';
import useToast from '@/hooks/useToast';
import SpinnerLoader from '@/components/SpinnerLoader';
import Select from 'react-select';
import {useRouter} from 'next/navigation';
import {AddIcon} from '@/shared/svgImages/tableImages';

const AddSalesPerson = () => {
  const [formData, setFormData] = useState({email: ''});
  const [roleType, setRoleType] = useState('');
  const [createNewRole, setcreateNewRole] = useState(false);

  const handleRoleType = roletype => setRoleType(roletype);
  const handleNewRole = () => setcreateNewRole(!createNewRole);
  
  const loginType = 'manager';
  const selectStyles = {
    control: (provided, state) => ({
      ...provided,
      boxShadow: 'none',
      '&:hover': {
        borderColor: 'none',
      },

      outline: state.isFocused ? 'none' : 'none',
      borderColor: state.isFocused ? 'none' : 'none',
      fontWeight: 'bold',
      color: 'black',
      borderRadius: '12px',
      padding: '1px',
      boxShadow: 'none',
    }),
    option: (provided, state) => ({
      ...provided,
      color: 'black',
      '&:hover': {
        background: 'rgb(0,0,0,0.05)',
      },
      background: '#fff',
      borderBottom: '1px solid rgb(0,0,0,0.05)',
    }),
    menu: (provided, state) => ({
      ...provided,
      overflowY: 'auto',
      '&::-webkit-scrollbar': {
        background: ' #d87138',
      },
      '&::-webkit-scrollbar': {
        width: '5px',
        backgroundColor: 'rgb(216, 113, 56, 0.2)',
      },
      '&::-webkit-scrollbar-thumb': {
        background: '#d87138',
      },
    }),
  };
  const {user, salesApprovalLoading} = useSelector(state => state.userAuth);
  const {showSuccessToast, showErrorToast} = useToast();
  const dispatch = useDispatch();

  const roles = [
    {label: 'Manager', value: 'Manager'},
    {label: 'Sales Person', value: 'salesPerson'},
  ];

  const handleChange = e => {
    const {name, value, type} = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value,
    }));
  };
  const handleFormSubmit = async e => {
    e.preventDefault();
    try {
      let response = await dispatch(salesApproval(formData));

      const {
        payload: {responseData},
      } = response;

      if (responseData.status | responseData.success) {
        showSuccessToast(responseData.message, 'top-right', 'light');
      } else {
        showErrorToast(responseData.Error, 'top-right', 'light');
      }
    } catch (error) {
      console.error('Login error:', error);
    }
  };
  const {email} = formData;
  return (
    <main className="h-[100vh] flex items-center relative justify-center bg-Light_Cyan">
      <div className="flex absolute top-[50px] left-[80px] border bg-white px-[15px] items-center py-[10px] rounded-[16px] shadow gap-[10px] font-[700] text-[12px] tracking-wide">
        <HomeIcon />
        <Link href="/">
          <span className="uppercase"> go to home</span>
        </Link>
      </div>
      <form
        className={` h-[450px] relative rounded-[16px]  px-[40px]  py-[38px] flex flex-col w-[454px] gap-[24px] bg-white`}
        onSubmit={handleFormSubmit}>
        <p className="text-center w-full text-[24px] font-[600] leading-[normal]">Add New Sales Person</p>
        <div className="flex flex-col mt-[50px] gap-[8px]">
          <label className="block text-[13px] font-semibold  text-gray-900" htmlFor="Email ID">
            Email ID
          </label>
          <div className="border-silver focus-within:border-vivid_orange focus-within:border  w-full gap-[8px] rounded-[8px] py-1 px-[15px] border flex">
            <MailIcon />
            <input
              required
              type="email"
              id="Email ID"
              name="email"
              value={email}
              className="focus:outline-none"
              onChange={handleChange}
            />
          </div>
        </div>
        <div className="w-full">
          <Select
            styles={selectStyles}
            placeholder="Select role"
            className="w-full"
            onChange={handleRoleType}
            options={roles}
            value={roleType}
          />
        </div>
        {createNewRole ? (
          <div className="flex gap-[10px] b items-center w-full">
            <div className="items-center w-[90%] border flex-shrink-0 py-[7.2px] px-[2px] rounded-[12px] overflow-hidden flex">
              <IdIcon fill="black" />
              <input
                type="text"
                name="name"
                id="name"
                required
                placeholder="Enter the New Role"
                className="focus:outline-none px-[2px]"
              />
            </div>
            <button onClick={handleNewRole} className="cursor-pointer">
              <AddIcon fill="#FF8541" />
            </button>
          </div>
        ) : loginType === 'manager' ? (
          <div
            onClick={handleNewRole}
            className="cursor-pointer  flex items-center gap-[10px] bg-vivid_orange text-white w-fit px-[20px] h-[40px] rounded-[16px] ">
            Add New Role <AddIcon />
          </div>
        ) : (
          ''
        )}
        {salesApprovalLoading ? (
          <button
            type="button"
            className="w-full p-[12px] mt-[40px] font-[600] text-center bg-vivid_orange text-white text-[16px] rounded-[8px]">
            <center>
              <SpinnerLoader />
            </center>
          </button>
        ) : (
          <button
            type="submit"
            className="w-[370px] absolute mx-auto bottom-[30px] p-[12px] font-[600] text-center bg-vivid_orange text-white text-[16px] rounded-[8px]">
            Submit
          </button>
        )}
      </form>
    </main>
  );
};

export default AddSalesPerson;
