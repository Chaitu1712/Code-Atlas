import React from 'react';
import reactLogo from '../assets/react.svg'; 
import warnIcon from '../assets/warning.svg';
import addIcon from '../assets/add.svg';
import homeIcon from '../assets/home.svg';
import closeIcon from '../assets/close.svg';
import authorIcon from '../assets/author.svg';
import modifierIcon from '../assets/modifier.svg';
import searchIcon from '../assets/search.svg';
import trashIcon from '../assets/trash.svg';
import settingsIcon from '../assets/settings.svg';
import folderIcon from '../assets/folder.svg';
import historyIcon from '../assets/history.svg';
import rocketIcon from '../assets/rocket.svg';
import playIcon from '../assets/play.svg';
import plusIcon from '../assets/plus.svg';
import logoutIcon from '../assets/logout.svg';

const Placeholder = ({ src, size = 16, alt = "icon", color }) => (
    <img src={src||reactLogo} alt={alt} style={{ width: size, height: size, filter: color ? `brightness(0) saturate(100%) invert(${color === 'white' ? 1 : 0})` : 'none'}} />
);

export const IconAdd = () => <Placeholder src={addIcon} alt="Add" size={24}/>;
export const IconTrash = () => <Placeholder src={trashIcon} alt="Delete"/>;
export const IconHome = () => <Placeholder src={homeIcon} alt="Home"/>;
export const IconClose = ({ size }) => <Placeholder src={closeIcon} size={size} alt="Close"/>;
export const IconAuthor = ({ size = 16 }) => <Placeholder src={authorIcon} size={size} alt="Author"/>;
export const IconModifier = ({ size = 16 }) => <Placeholder src={modifierIcon} size={size} alt="Modifier"/>;
export const IconSearch = () => <Placeholder src={searchIcon} alt="Search" color="white"/>;
export const IconWarn = () => <Placeholder src={warnIcon} alt="Warning" size={24}/>;
export const IconSettings = () => <Placeholder src={settingsIcon} alt="Settings"/>;
export const IconCloud = () => <span style={{ fontSize: "16px" }}>☁️</span>;
export const IconShield = () => <span style={{ fontSize: "16px" }}>🛡️</span>;
export const IconPalette = () => <span style={{ fontSize: "16px" }}>🎨</span>;
export const IconLock = () => <span style={{ fontSize: "14px", color: "#94a3b8" }}>🔒</span>;
export const IconFolder = () => <Placeholder src={folderIcon} alt="Folder"/>;
export const IconHistory = () => <Placeholder src={historyIcon} alt="History"/>;
export const IconRocket = () => <Placeholder src={rocketIcon} alt="Rocket"/>;
export const IconPlay = () => <Placeholder src={playIcon} alt="Play" />;
export const IconPlus = () => <Placeholder src={plusIcon} alt="Plus" />;
export const IconLogout = () => <Placeholder src={logoutIcon} alt="Logout" />;