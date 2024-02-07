import { Block, GgList, Label, MonthIcon, PersonIcon, Tick } from "../svgImages/sideBarImages";

export const routeObject = {
  "/": "All Requests",
  "/unreadrequests": "Unread Requests",
  "/important": "Important",
  "/completed": "Completed",
  "/notintrested": "Not Intrested",
  "/monthwisepayment": "Month-wise Payment",
  "/personwisepayment": "Person-wise Payment",
};
export const MenuItems = [
  {
    text: "All Requests",
    imgBlack: <GgList />,
    imgWhite: <GgList fill="white" />,
  },
  // {
  //   text: "Unread Requests",
  //   imgBlack: <GgList />,
  //   imgWhite: <GgList fill="white" />,
  // },
  // {
  //   text: "Important",
  //   imgBlack: <Label />,
  //   imgWhite: <Label fill="white" />,
  // },
  // {
  //   text: "Completed",
  //   imgBlack: <Tick />,
  //   imgWhite: <Tick stroke="white" />,
  // },
  // {
  //   text: "Not Intrested",
  //   imgBlack: <Block />,
  //   imgWhite: <Block fill="white" />,
  // },
  // {
  //   text: "Month-wise Payment",
  //   imgBlack: <MonthIcon />,
  //   imgWhite: <MonthIcon fill="white" />,
  // },
  // {
  //   text: "Person-wise Payment",
  //   imgBlack: <PersonIcon />,
  //   imgWhite: <PersonIcon fill="white" />,
  // },
];
