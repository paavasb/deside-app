import React, { useContext } from 'react'
import YourQuestion from './YourQuestion'
import questionsList from '../playground/questions'
import QuestionsContext from '../context/questions-context'
import { firebase } from '../firebase/firebase';
import UserContext from '../context/user-context';

const YourQuestions = () => {
    const { questions, dispatch } = useContext(QuestionsContext)
    const { user, userDispatch } = useContext(UserContext)
    //const [questions, setQuestions] = useState(questionsList)
    //TODO: Get questions from User's list of questions
    return (
        <div className="content-container">
            {questions.map((question, index) => {
                if(question.creator ===  user.userID)
                return (
                    <YourQuestion key={question.id} question={question}/>
                )
            })}
        </div>
    )
}

export default YourQuestions