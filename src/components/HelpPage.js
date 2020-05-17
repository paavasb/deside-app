import React from 'react';
import { Link } from 'react-router-dom';

const title = "Welcome to DeSide!"
const subtitle = "Let the internet deside"
const Q1 = "What is DeSide?"
const A1_1 = "DeSide is Q/A-based Social Media platform.\n" 
const A1_2 = "\nToo nervous, too scared, too unsure, or simply too lazy to make a decision? "
 + "Ask a question to see what the internet thinks. "
 + "Ask a question to put your fate in the hands of the internet. "
 + "Ask a question and let the internet deside!"
const Q2 = "What all can you do on DeSide?"
const A2_1 = "Post questions to receive advice, ask for opinions, get recommendations (and more!) "
+ "from your followers, and/or all DeSide users! " 
+ "You can ask private questions meant only for your followers, and anonymous questions so no one knows!"
const A2_2 = "Ask a Question Here"
const A2_3 = "View all the questions you’ve posted so far (even the anonymous ones) and their current results!"
const A2_4 = "View Your Questions Here"
const A2_5 = "Answer questions anonymously, give your opinion, and help others DeSide!"
const A2_6 = "Answer Questions Here"
const A2_7 = "Search for questions based on their title, tags, or date."
const A2_8 = "Answer Questions Here"
const A2_9 = "View questions posted by the users you follow. "
+ "View the questions you’ve already answered and their results. "
+ "Or view only the questions you’ve not yet answered and go on a deciding spree!"
const A2_10 = "Answer Questions Here"
const A2_11 = "Visit your user profile and check-out your DeSide Score. "
+ "Set/Update your username. Search and add other users and friends. "
+ "View all your followers and all those you follow."
const A2_12 = "View Your Profile Here"
const A2_13 = "Find the Easter Egg!"
const Q3 = "What is the DeSide Score?"
const A3_1 = "Each user gets a score based on their interactions with DeSide. "
+ "Add questions, answer questions, follow users, and gain followers to increase your DeSide Score. "
+ "Screenshot and share your score with your friends for bragging rights!"
const A3_2 = "Checkout your DeSide Score"
 
const HelpPage = () => {

    

    return (
        <div className="content-container content-container--help">
            <div>
                <div className="help-page__title">{title}</div>
                <div className="help-page__subtitle">{subtitle}</div>
            </div>
            <div className="help-page__section">
                <div className="help-page__section__question">{Q1}</div>
                <div className="help-page__section__answer">{A1_1}</div>
                <div className="help-page__section__answer">{A1_2}</div>
            </div>
            <div className="help-page__section">
                <div className="help-page__section__question">{Q2}</div>
                <ul className="help-page__section__list">
                <li className="help-page__section__answer">{A2_1}</li>
                <Link className="help-page__section__link" to="/add">{A2_2}</Link>
                <li className="help-page__section__answer">{A2_3}</li>
                <Link className="help-page__section__link" to="/yourquestions">{A2_4}</Link>
                <li className="help-page__section__answer">{A2_5}</li>
                <Link className="help-page__section__link" to="/questions">{A2_6}</Link>
                <li className="help-page__section__answer">{A2_7}</li>
                <Link className="help-page__section__link" to="/questions">{A2_8}</Link>
                <li className="help-page__section__answer">{A2_9}</li>
                <Link className="help-page__section__link" to="/questions">{A2_10}</Link>
                <li className="help-page__section__answer">{A2_11}</li>
                <Link className="help-page__section__link" to="/user">{A2_12}</Link>
                <li className="help-page__section__answer">{A2_13}</li>
                </ul>
            </div>
            <div className="help-page__section">
                <div className="help-page__section__question">{Q3}</div>
                <div className="help-page__section__answer">{A3_1}</div>
                <Link className="help-page__section__link" to="/user">{A3_2}</Link>
            </div>
        </div>
    )
}

export default HelpPage;