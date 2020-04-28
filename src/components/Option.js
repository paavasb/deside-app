import React from 'react';

const Option = (props) => (
    <div className="option-input">
        <p className="option-input__text">{props.count}. {props.optionText} </p>
        <button 
            onClick={(e) => {
                e.preventDefault();
                props.handleDeleteOption(props.optionText)
            }}
            className="option-input__button"
        >
            Remove
        </button>
    </div>
);

export default Option;