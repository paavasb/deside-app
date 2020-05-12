import React, { useContext } from 'react'
import YourQuestion from './YourQuestion'
import QuestionsContext from '../context/questions-context'
import { firebase } from '../firebase/firebase';
import UserContext from '../context/user-context';
import { getYourQuestions } from '../selectors/questions';
import { Link } from 'react-router-dom';

const YourQuestions = () => {
    const { questions, dispatch } = useContext(QuestionsContext)
    const { user, userDispatch } = useContext(UserContext)
    //const [questions, setQuestions] = useState(questionsList)

    const yourQuestionsList = getYourQuestions(questions, user.userID)
    //TODO: Get questions from User's list of questions
    return (
        <div className="content-container">
            {
                yourQuestionsList.length === 0 ? 
                <div className="content-container content-container--yourquestions">
                    <div>You have added no questions yet</div>
                    <Link 
                        className="content-container content-container--yourquestions__text"
                        to="/add">Add Questions Now</Link>
                </div>
                : 
                <div className="content-container content-container--yourquestions">
                    You have added {yourQuestionsList.length} question(s)
                </div>
            }
            {yourQuestionsList.map((question) => {
                return (
                    <YourQuestion key={question.id} question={question}/>
                )
            })}
        </div>
    )
}

export default YourQuestions