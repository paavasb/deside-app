import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { connect } from 'react-redux';
import { startLogout } from '../actions/auth';

export const Header = ({ startLogout }) => {

    const [moreStatus, setMoreStatus] = useState(false)
    const [found, setFound] = useState(false)

    const onLogoClick = () => {
        if(document.getElementById("logo").src.includes("logo.png")) {
            document.getElementById("logo").src = "../images/logo_reverse.png";
        } else if(document.getElementById("logo").src.includes("logo_reverse.png")) {
            document.getElementById("logo").src = "../images/logo.png";
        }
        if(!found) {
            alert('Congratulations!! You found the easter egg!')
            setFound(true)
        }
    }

    return (
        <header className="header">
            <div className="content-container-header">
                <div className="header__content">
                    <img id="logo" className="header__img" src="../images/logo.png" onClick={onLogoClick}/>
                    <NavLink className="button button--link" to="/add" activeClassName="button button--link-active">
                        <p>Add a Question</p>
                    </NavLink>
                    <NavLink className="button button--link" to="/questions" activeClassName="button button--link-active">
                        <p>Answer Questions</p>
                    </NavLink>
                    <NavLink className="button button--link" to="/yourquestions" activeClassName="button button--link-active">
                        <p>Your Questions</p>
                    </NavLink>
                    <NavLink className="button button--link-last" to="/user" activeClassName="button button--link-last-active">
                        <p>Your Profile</p>
                    </NavLink>
                    <div className="">
                        {
                            moreStatus ?
                            <div className="header__menu">
                            <NavLink className="button button--logout" to="/help">
                                Help
                            </NavLink>
                            <button className="button button--logout" onClick={startLogout}>Logout</button>
                            <button className="button button--x" onClick={() => setMoreStatus(false)}>x</button>
                            </div> 
                            
                            :
                            <div className="button button--menu" onClick={() => setMoreStatus(true)}>≡</div>
                        }    
                    </div>
                </div>
            </div>
        </header>
    )
}

const mapDispatchToProps = (dispatch) => ({
    startLogout: () => dispatch(startLogout())
});

export default connect(undefined, mapDispatchToProps)(Header);