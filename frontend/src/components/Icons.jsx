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