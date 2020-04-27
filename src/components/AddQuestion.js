import React, { useContext, useState, useReducer } from 'react';
import database from '../firebase/firebase';
import TagsInput from 'react-tagsinput';
import 'react-tagsinput/react-tagsinput.css';
import QuestionsContext from '../context/questions-context';
import { startAddQuestion } from '../actions/questions';
import Options from '../components/Options';
import AddOption from './AddOption';
import moment from 'moment';
import questionsReducer from '../reducers/questions';

const AddQuestion = () => {
    const [questions, dispatch] = useReducer(questionsReducer, []);
    const [title, setTitle] = useState('');
    const [options, setOptions] = useState(['Yes', 'No', 'Maybe']);
    const [tags, setTags] = useState([]);
    const [createdAt, setCreatedAt] = useState(0);
    const [newOption, setNewOption] = useState('');
    const [error, setError] = useState('');

    const handleDeleteOptions = (e) => {
        e.preventDefault();
        setOptions([]);
    }

    const handleDeleteOption = (optionToRemove) => {
        setOptions(options.filter(option => option !== optionToRemove))
    }

    const onSubmitHandler = (e) => {
        e.preventDefault();
        const question = {
            title,
            options: options.map((value) => ({text: value, votes: 0})),
            tags,
            createdAt: moment().format()
        }
        //database.ref(`all-questions`).push(question);
        dispatch(startAddQuestion(question));
        console.log('Now');
    }

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

    return (
        <QuestionsContext.Provider value={{ questions, dispatch }}>
            <p>Add a question!</p>
            <form onSubmit={onSubmitHandler}>
                <textarea value={title} onChange={(e) => setTitle(e.target.value)}/>
                <Options options={options} handleDeleteOptions={handleDeleteOptions} handleDeleteOption={handleDeleteOption}/>
                <AddOption handleAddOption={handleAddOption}/>
                <TagsInput value={tags} onlyUnique={true} onChange={(tags) => setTags(tags)}/>
                <button>Submit Question</button>
            </form>

        </QuestionsContext.Provider>
        )
}

export default AddQuestion