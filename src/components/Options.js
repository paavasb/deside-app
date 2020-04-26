import React, { useState } from 'react';
import Option from './Option';

const Options = (props) => {

    //const { dispatch } = useContext(NotesContext)
    // const [options, setOptions] = useState([]);


    return (
        <div>
            <div>
                <h3>Your Options</h3>
                <button 
                    onClick={props.handleDeleteOptions}
                >
                    Remove All
                </button>
                {props.options.length === 0 && <p className="widget__message">Please add an option to get started</p>}
                {
                    props.options.map((option, index) => (
                        <Option 
                            key={option} 
                            optionText={option} 
                            count={index + 1}
                            handleDeleteOption = {props.handleDeleteOption}
                        />
                    ))
                }
            </div>   

        </div>
    )
}

export default Options;