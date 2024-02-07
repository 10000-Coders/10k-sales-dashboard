import TopBar from '@/components/TopBar';
import StudetTable from '@/components/studentTable/StudentTable';

const Completed = () => {
  return (
    <main className="w-[calc(100%-251.6px)] float-right">
      <div className="w-full mx-auto">
        <div className="w-[90%] flex flex-col gap-[40px] mx-auto">
          <TopBar />
          <StudetTable />
        </div>
      </div>
    </main>
  );
};
export default Completed;
