'''
  This file is part of the PyPhantomJS project.

  Copyright (C) 2011 James Roe <roejames12@hotmail.com>

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
''' 

import codecs

from plugincontroller import add_action

from PyQt4.QtCore import qWarning, pyqtSlot

@pyqtSlot(str, str, result=bool)
def saveToFile(self, text, fileName):
    fileName = self.m_scriptDir + fileName
    try:
        f = codecs.open(fileName, 'w+', 'utf-8')
    except IOError:
        qWarning('phantom.saveToFile - Could not open file: \'%s\'' % fileName)
        return False

    f.write(text)
    f.close()

    return True

@add_action('Phantom')
def run(_locals):
    _locals.saveToFile = saveToFile
