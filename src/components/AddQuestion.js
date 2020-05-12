import React, { useContext, useState, useEffect } from 'react';
import database from '../firebase/firebase';
import TagsInput from 'react-tagsinput';
import QuestionsContext from '../context/questions-context';
import { startAddQuestion } from '../actions/questions';
import Options from '../components/Options';
import AddOption from './AddOption';
import moment from 'moment';
import questionsReducer from '../reducers/questions';
import * as firebase from 'firebase';
import uuid from  'uuid';
import UserContext from '../context/user-context';
import Switch from "react-switch";

const AddQuestion = () => {
    const { questions, dispatch } = useContext(QuestionsContext)
    const { user, userDispatch } = useContext(UserContext)
    //const [questions, dispatch] = useReducer(questionsReducer, []);
    const [title, setTitle] = useState('');
    const [options, setOptions] = useState([]);
    const [tags, setTags] = useState([]);
    const [createdAt, setCreatedAt] = useState(0);
    const [newOption, setNewOption] = useState('');
    const [error, setError] = useState('');
    const [anonymous, setAnonymous] = useState(false);
    const [priv, setPriv] = useState(false);

    const handleDeleteOptions = (e) => {
        e.preventDefault();
        setOptions([]);
    }

    const handleDeleteOption = (optionToRemove) => {
        setOptions(options.filter(option => option !== optionToRemove))
    }

    const onSubmitHandler = (e) => {
        e.preventDefault();
        const defaultTags = ['none'];
        const question = {
            title,
            options: options.map((value) => ({text: value, votes: 0})),
            tags: tags.length === 0 ? defaultTags : tags.map((tag) => tag.trim()),
            createdAt: moment().format(),
            creator: firebase.auth().currentUser.uid,
            anonymous,
            priv,
            id: uuid()
        }
        startAddQuestion(dispatch, question, userDispatch, user.userID);
    }

    // useEffect(() => {
    //     const json = JSON.stringify(questions);
    //     localStorage.setItem('questions', json); 
    //   }, [questions])

    const handleAddButton = (event) => {
        event.preventDefault();
        const formInput = newOption.trim();
        const error = handleAddOption(formInput);
        
        setError(error);

        if(!error) {
            setNewOption('');
        }
    };

    const handleAddOption = (option) => {
        if(!option) {
            return 'Enter valid value to add item';
        } else if (options.indexOf(option) > -1) {
            return 'This option already exists';
        }
        setOptions([...options, option]);
    }

    const handleTitleChange = (e) => {
        setTitle(e.target.value); 
    }

    const onAnonymousChange = (anon) => {
        setAnonymous(anon)
        console.log(anon)
    }
    const onPrivateChange = (pri) => {
        setPriv(pri)
        console.log(pri)
    }

    return (
        <div className="content-container">
            <div className="add-question">
                <h1 className="add-question__text">Add a Question</h1>
                <form onSubmit={onSubmitHandler}>
                    <input value={title} onChange={handleTitleChange} className="add-question__input"/>
                    <Options options={options} handleDeleteOptions={handleDeleteOptions} handleDeleteOption={handleDeleteOption}/>
                    <AddOption handleAddOption={handleAddOption}/>
                    <TagsInput 
                        value={tags} onlyUnique={true} 
                        onChange={(tags) => setTags(tags)}
                        addOnBlur={true}
                        maxTags={20}
                    />
                    <div className="add-question__switches">
                        <div className="add-question__switch">
                            <p className=" add-question__switch__text add-question__switch__text--prompt">Post As</p>
                            <div className="add-question__options">
                                <p className={anonymous ? "add-question__switch__text" : "add-question__switch__text add-question__switch__text--chosen"}>{user.username}</p>
                                <Switch 
                                    checked={anonymous} 
                                    onChange={onAnonymousChange}
                                    offColor='#282b36'
                                    onColor='#282b36'
                                    onHandleColor='#a5afd7'
                                    offHandleColor='#a5afd7'
                                    checkedIcon={false}
                                    uncheckedIcon={false}
                                />
                                <p className={!anonymous ? "add-question__switch__text" : "add-question__switch__text add-question__switch__text--chosen"}>Anonymous</p>    
                            </div>
                        </div>
                        <div className="add-question__switch">
                            <p className="add-question__switch__text add-question__switch__text--prompt">Visibility</p>
                            <div className="add-question__options">
                                <p className={priv ? "add-question__switch__text" : "add-question__switch__text add-question__switch__text--chosen"}>Public</p>
                                <Switch 
                                    checked={priv} 
                                    onChange={onPrivateChange}
                                    offColor='#282b36'
                                    onColor='#282b36'
                                    onHandleColor='#a5afd7'
                                    offHandleColor='#a5afd7'
                                    checkedIcon={false}
                                    uncheckedIcon={false}
                                />
                                <p className={!priv ? "add-question__switch__text" : "add-question__switch__text add-question__switch__text--chosen"}>Private</p>    
                            </div>   
                        </div>
                    </div>     
                    <button 
                        className="big-button"
                        disabled={!(title.length > 0 && options.length > 1)}
                    >
                        Submit Question
                    </button>
                </form>
            </div>

        </div>
        )
}

export default AddQuestion